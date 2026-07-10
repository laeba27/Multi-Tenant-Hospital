Yes — that's already in place. patients.js:584-588 calls updateUserById with email: normalized and email_confirm: true, which writes the new address into auth.users.email and marks email_confirmed_at, then profiles is updated right after.

The email_confirm: true flag is the key part: without it, Supabase would treat the new address as pending and fire its own confirmation email — which would mean the patient verifies twice (once via our OTP, once via Supabase's link). Setting it tells Supabase "I already proved they own this," so it lands verified with no second email.

But let me not just take the code's word for it. Let me verify against your real Supabase instance that updateUserById actually flips email_confirmed_at on an email change rather than silently parking it in new_email.




Verified end-to-end against your real Supabase instance (test user cleaned up afterward):

auth.users.email swaps from the placeholder to the real address
email_confirmed_at is SET, and new_email stays null — so it lands verified immediately, with no second Supabase confirmation email
it persists on re-read, not just in the response echo
the patient can sign in with the new email and new password
the old placeholder is correctly rejected
So what you're asking for is already the behavior. The one thing that isn't updated in auth is the user_metadata, which still carries the role and fullName set at creation. That doesn't affect login or verification — nothing reads it — so I'd leave it alone unless you have a reason to want it in sync.

Worth being precise about which verified field you mean, though, because there are two and they're independent:

auth.users.email_confirmed_at — Supabase's own flag. Already set by email_confirm: true. ✅

profiles.email_verified — our column from migration 026. Set on the line right after. ✅

Both are handled, and in that order deliberately: the auth update runs first because it's the one that can fail on a unique-email race. If it does, we bail out before touching profiles, so the two never disagree. Doing it the other way round could leave profiles claiming an email that auth never accepted.

The order matters for one more reason. updateUserById sets the email and the password in a single call, so a patient can't end up with a verified new email but still holding the phone-number password.

The remaining blocker is unchanged: migration 026 still isn't applied, so must_complete_profile and email_verified don't exist as columns yet and patient registration will still fail. Paste 026_patient_profile_completion.sql into the Supabase SQL Editor and run it. Want me to also extend the middleware gate to force the password change for patients who registered with a real email, as I mentioned last time?