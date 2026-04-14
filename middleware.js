import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

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
          return request.cookies.getAll()
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

  let profile = null

  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/auth/'))) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select(
        `
        role,
        status,
        access_granted,
        hospital_id,
        hospitals:hospital_id(
          account_status
        )
      `
      )
      .eq('id', user.id)
      .single()

    profile = profileData
  }

  const profileStatus = (profile?.status || '').toLowerCase()
  const hospitalStatus = (profile?.hospitals?.account_status || '').toLowerCase()
  const isHospitalAdmin = profile?.role === 'hospital_admin'
  const hasHospitalAccess =
    !isHospitalAdmin ||
    (profile?.access_granted === true && ['active', 'approved'].includes(hospitalStatus || 'active'))
  const hasProfileAccess =
    profile?.role === 'super_admin' || !profileStatus || ['active', 'approved'].includes(profileStatus)

  // If logged in but access is revoked/pending, force back to sign-in for dashboard routes.
  if (user && pathname.startsWith('/dashboard') && (!profile || !hasHospitalAccess || !hasProfileAccess)) {
    const reason = isHospitalAdmin && !hasHospitalAccess ? 'pending-approval' : 'access-revoked'
    return NextResponse.redirect(new URL(`/auth/sign-in?reason=${reason}`, request.url))
  }

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (user && pathname.startsWith('/auth/') && profile && hasHospitalAccess && hasProfileAccess) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is accessing dashboard, verify they have access to their role's pages
  if (user && pathname.startsWith('/dashboard/')) {
    try {
      if (!profile) {
        return NextResponse.redirect(new URL('/auth/sign-in', request.url))
      }

      // Get the requested dashboard route
      const dashboardMatch = pathname.match(/\/dashboard\/([^/]+)/)
      const requestedRole = dashboardMatch ? dashboardMatch[1] : null

      // Map role to dashboard path
      const roleToPath = {
        hospital_admin: 'hospital',
        doctor: 'doctor',
        staff: 'staff',
        receptionist: 'reception',
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
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
