import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import omise from 'omise'

const omiseClient = omise({
  secretKey: process.env.OMISE_SECRET_KEY as string,
  omiseVersion: '2019-05-29'
})

export async function POST(req: Request) {
  try {
    const { charge_id, order_id } = await req.json()

    if (!charge_id || !order_id) {
      return NextResponse.json({ error: 'Missing charge_id or order_id' }, { status: 400 })
    }

    // 1. Retrieve the charge from Omise to check its true status
    const charge = await new Promise((resolve, reject) => {
      omiseClient.charges.retrieve(charge_id, (err: any, resp: any) => {
        if (err) reject(err)
        else resolve(resp)
      })
    }) as any

    // 2. If it's successful, update the database
    if (charge.status === 'successful') {
      const supabase = createAdminClient()

      // Update Order Status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order_id)

      if (updateError) throw updateError

      // Create Payment Record automatically since we skip the manual slip upload
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id,
          amount: charge.amount / 100, // Back to THB
          status: 'verified', // Auto verified
          slip_url: 'AUTO_PROMPTPAY', // Marker that this was auto-paid
        })

      if (paymentError) throw paymentError

      return NextResponse.json({ status: 'successful' })
    }

    // If pending or failed, just return the status
    return NextResponse.json({ status: charge.status })

  } catch (err: any) {
    console.error('Omise Check Status Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
