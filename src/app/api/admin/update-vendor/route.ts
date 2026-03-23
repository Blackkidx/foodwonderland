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

    // 2. Proceed with update
    const { vendor_id, full_name, password } = await req.json()

    if (!vendor_id || !full_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Update Auth User if password is provided
    if (password && password.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(vendor_id, {
        password: password
      })
      if (authError) {
        return NextResponse.json({ error: authError.message ?? 'Failed to update password' }, { status: 400 })
      }
    }

    // Update Profile full_name
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name })
      .eq('id', vendor_id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
