import { createAdminClient } from '@/lib/supabase/server'
import { sendFollowUpReminders } from '@/lib/cron/followUpReminders'

/**
 * Daily job, run by Vercel Cron (see vercel.json).
 *
 * Schedule "31 18 * * *" is 18:31 UTC = 12:01 AM IST. Vercel cron times are
 * always UTC. On the free Hobby plan Vercel may fire it any time within that
 * hour (12:01-12:59 AM IST), and only production deployments run crons.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set
 * in the project's environment variables -- reject everything else, or anyone
 * who finds the URL can trigger the job.
 *
 * Add `?dryRun=1` to see who would be reminded without sending anything.
 *
 * Jobs:
 *   - follow-up reminders: patients whose prescription follow-up is 2 days
 *     away (or tomorrow, if a run was missed) get a notification.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'

  try {
    const supabase = await createAdminClient()
    const followUps = await sendFollowUpReminders(supabase, { dryRun })

    console.log('[cron/daily] follow-up reminders', JSON.stringify({
      dryRun,
      today: followUps.today,
      candidates: followUps.candidates,
      sent: followUps.sent,
      alreadySent: followUps.alreadySent,
      skipped: followUps.skipped.length,
      failed: followUps.failed.length,
    }))

    return Response.json({ ok: followUps.failed.length === 0, dryRun, followUps })
  } catch (error) {
    console.error('[cron/daily] failed:', error)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
