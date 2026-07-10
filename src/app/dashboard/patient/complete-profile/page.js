import CompleteProfileForm from './CompleteProfileForm'

export const metadata = {
  title: 'Complete Your Profile - Smile Returns',
  description: 'Add your email address and set a password to finish setting up your patient account.',
}

export default function CompleteProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="mx-auto max-w-lg">
        <CompleteProfileForm />
      </div>
    </div>
  )
}
