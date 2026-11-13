import { createClient } from '@/lib/supabase/server'
import CompleteProfileForm from './CompleteProfileForm'

export const metadata = {
  title: 'Finish Setting Up - Smile Return',
  description: 'Add your email and choose your own password to finish setting up your patient account.',
}

export const dynamic = 'force-dynamic'

export default async function CompleteProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('registration_no, must_complete_profile')
        .eq('id', user.id)
        .single()
    : { data: null }

  // Middleware only sends a patient here when a flag is set. With a real email
  // already on file, only the password is left to do.
  const mode = profile?.must_complete_profile === false ? 'password' : 'full'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 sm:py-10 px-4">
      <div className="mx-auto max-w-lg">
        <CompleteProfileForm mode={mode} registrationNo={profile?.registration_no || null} />
      </div>
    </div>
  )
}
