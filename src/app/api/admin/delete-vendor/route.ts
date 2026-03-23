import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // 1. Verify caller is super_admin
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden. Super Admin only.' }, { status: 403 })
    }

    // 2. Proceed with delete
    const { vendor_id } = await req.json()

    if (!vendor_id) {
      return NextResponse.json({ error: 'Missing vendor_id' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Delete the user from auth.users (cascades to profiles and vendor_assignments)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(vendor_id)

    if (authError) {
      return NextResponse.json({ error: authError.message ?? 'Failed to delete user' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
