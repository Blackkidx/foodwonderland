import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/vendor')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else {
    // Fetch profile to get role for RBAC
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Protect admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url)) // redirect unauthorized to home
    }

    // Protect vendor routes
    if (request.nextUrl.pathname.startsWith('/vendor') && role !== 'vendor' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url)) // redirect unauthorized to home
    }
  }

  return supabaseResponse
}
