import { createClient } from '@supabase/supabase-js'

/**
 * Admin client ใช้ Service Role Key
 * ใช้ได้เฉพาะ Server-side เท่านั้น (API routes, Server Actions)
 * ห้ามนำไปใช้ใน 'use client' components เด็ดขาด
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
