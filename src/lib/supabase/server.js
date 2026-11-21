import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Fail with a message that names the missing variable.
 *
 * Passing undefined into createServerClient produces an error deep in the
 * request layer that reads like a network fault, which sent us hunting the
 * wrong problem. Roughly forty-five server actions build a client as their
 * first statement -- often outside their own try block -- so an unhelpful throw
 * here surfaced as an HTML error page and a "Unexpected token '<'" on the
 * client. Checking here means one clear message instead.
 */
function requireEnv(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `${name} is not configured. Set it in the Vercel project environment variables.`
    )
  }

  return value
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  )
}

/**
 * A client that really is the service role: it bypasses RLS, always.
 *
 * createAdminClient() below is NOT that. It reads the request's auth cookies,
 * and supabase-js sends a signed-in user's access token in place of the key
 * whenever it finds a session -- so for a logged-in user it runs under RLS as
 * that user. For a patient that meant prescription_values (staff-only) came
 * back empty and their prescriptions printed blank.
 *
 * Every query made with this client must scope itself (by patient, doctor or
 * hospital) and check ownership first: nothing in the database will.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

export async function createAdminClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
           // Admin client might not need to set cookies for session, but likely won't hurt
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    }
  )
}
