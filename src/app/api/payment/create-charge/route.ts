import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    const secretKey = process.env.OMISE_SECRET_KEY
    const publicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY
    if (!secretKey) {
      console.error('OMISE_SECRET_KEY is not set!')
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
    }

    // Initialize Omise — SDK requires both publicKey and secretKey
    const OmiseModule = await import('omise')
    const omiseInit = OmiseModule.default || OmiseModule
    const omiseClient = omiseInit({
      publicKey: publicKey,
      secretKey: secretKey,
    })

    const supabase = createAdminClient()

    // 1. Fetch exact total from the database to prevent client tampering
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Amount in Omise is strictly in smallest units (Satang for THB)
    // So 145.00 THB -> 14500 Satang
    const amountInSatang = Math.round(Number(order.total) * 100)

    // 2. Create the PromptPay source first
    const source = await new Promise((resolve, reject) => {
      omiseClient.sources.create({
        amount: amountInSatang,
        currency: 'THB',
        type: 'promptpay',
      }, (err: any, resp: any) => {
        if (err) reject(err)
        else resolve(resp)
      })
    }) as any

    // 3. Create the charge using the source
    const charge = await new Promise((resolve, reject) => {
      omiseClient.charges.create({
        amount: amountInSatang,
        currency: 'THB',
        source: source.id,
        return_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/complete`,
      }, (err: any, resp: any) => {
        if (err) reject(err)
        else resolve(resp)
      })
    }) as any

    // 4. Extract the QR Code download URI
    const qrCodeUri = charge.source?.scannable_code?.image?.download_uri

    return NextResponse.json({ 
      charge_id: charge.id, 
      qr_code_uri: qrCodeUri,
      amount: order.total
    })

  } catch (err: any) {
    console.error('Omise Create Charge Error:', err)
    return NextResponse.json({ error: err.message || 'Omise error' }, { status: 500 })
  }
}

