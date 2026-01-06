import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Skip middleware for auth pages and API routes
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip middleware for home page and public pages
  if (pathname === '/' || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getSetCookie()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to sign-in
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (user && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is accessing dashboard, verify they have access to their role's pages
  if (user && pathname.startsWith('/dashboard/')) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) {
        return NextResponse.redirect(new URL('/auth/sign-in', request.url))
      }

      // Get the requested dashboard route
      const dashboardMatch = pathname.match(/\/dashboard\/([^/]+)/)
      const requestedRole = dashboardMatch ? dashboardMatch[1] : null

      // Map role to dashboard path
      const roleToPath = {
        hospital_admin: 'hospital-admin',
        doctor: 'doctor',
        staff: 'staff',
        reception: 'reception',
        patient: 'patient',
        super_admin: 'super-admin',
      }

      const userDashboardPath = roleToPath[profile.role]

      // If user tries to access a dashboard that's not theirs, redirect to their dashboard
      if (requestedRole && requestedRole !== userDashboardPath) {
        return NextResponse.redirect(
          new URL(`/dashboard/${userDashboardPath}`, request.url)
        )
      }

      // If accessing /dashboard without a specific role, redirect to user's dashboard
      if (pathname === '/dashboard' || pathname === '/dashboard/') {
        return NextResponse.redirect(
          new URL(`/dashboard/${userDashboardPath}`, request.url)
        )
      }
    } catch (error) {
      console.error('Middleware error:', error)
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
