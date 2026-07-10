import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Redirect helper that preserves any auth cookies set on `response` so the
  // session stays in sync across the redirect.
  const redirectTo = (path) => {
    const redirect = NextResponse.redirect(new URL(path, request.url))
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie)
    })
    return redirect
  }

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

  // Get current user. If the session cookie is missing/stale/corrupt this can
  // throw — treat any failure as "not authenticated" and send dashboard
  // requests to sign-in instead of surfacing an error page.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (error) {
    console.error('Middleware auth check failed:', error)
    if (pathname.startsWith('/dashboard')) {
      return redirectTo('/auth/sign-in')
    }
    return response
  }

  // If no user, redirect to sign-in
  if (!user && pathname.startsWith('/dashboard')) {
    return redirectTo('/auth/sign-in')
  }

  let profile = null

  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/auth/'))) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select(
          `
          role,
          status,
          access_granted,
          hospital_id,
          must_complete_profile,
          hospitals:hospital_id(
            account_status
          )
        `
        )
        .eq('id', user.id)
        .single()

      profile = profileData
    } catch (error) {
      console.error('Middleware profile lookup failed:', error)
      profile = null
    }
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
    return redirectTo(`/auth/sign-in?reason=${reason}`)
  }

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (user && pathname.startsWith('/auth/') && profile && hasHospitalAccess && hasProfileAccess) {
    return redirectTo('/dashboard')
  }

  // A patient onboarded by reception holds a placeholder email and the phone
  // number as their password. Force them to supply + verify a real email and
  // set a password before anything else in the portal is reachable. Exclude the
  // completion page itself, or this redirects to itself forever.
  const completePath = '/dashboard/patient/complete-profile'
  if (
    user &&
    profile?.role === 'patient' &&
    profile?.must_complete_profile === true &&
    pathname.startsWith('/dashboard') &&
    pathname !== completePath
  ) {
    return redirectTo(completePath)
  }

  // Once complete, the completion page has nothing left to do.
  if (user && pathname === completePath && profile && profile.must_complete_profile !== true) {
    return redirectTo('/dashboard/patient')
  }

  // If user is accessing dashboard, verify they have access to their role's pages
  if (user && pathname.startsWith('/dashboard/')) {
    try {
      if (!profile) {
        return redirectTo('/auth/sign-in')
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
      if (requestedRole && userDashboardPath && requestedRole !== userDashboardPath) {
        return redirectTo(`/dashboard/${userDashboardPath}`)
      }

      // If accessing /dashboard without a specific role, redirect to user's dashboard
      if (pathname === '/dashboard' || pathname === '/dashboard/') {
        return redirectTo(`/dashboard/${userDashboardPath || ''}`)
      }
    } catch (error) {
      console.error('Middleware error:', error)
      return redirectTo('/auth/sign-in')
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
