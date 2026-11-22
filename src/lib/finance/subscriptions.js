/**
 * Where a hospital stands with its portal subscription, worked out from its
 * plan (hospital_subscriptions) and the payments recorded against it
 * (subscription_payments). Pure date arithmetic on 'YYYY-MM-DD' strings in
 * UTC, so the same inputs give the same answer on the server and in tests.
 *
 *   paid      the latest paid period hasn't ended yet
 *   due       it has ended, but we're still within the grace days
 *   overdue   past the grace days
 *   paused / cancelled   the plan isn't billing right now
 *   no_plan   no plan set for this hospital yet
 */

export const BILLING_CYCLES = {
  monthly: { label: 'Monthly', months: 1 },
  quarterly: { label: 'Quarterly', months: 3 },
  half_yearly: { label: 'Every 6 months', months: 6 },
  yearly: { label: 'Yearly', months: 12 },
}

export const SUBSCRIPTION_STATUS = {
  paid: { label: 'Paid up', tone: 'emerald' },
  due: { label: 'Due', tone: 'amber' },
  overdue: { label: 'Overdue', tone: 'rose' },
  paused: { label: 'Paused', tone: 'slate' },
  cancelled: { label: 'Cancelled', tone: 'slate' },
  no_plan: { label: 'No plan', tone: 'slate' },
}

const DAY = 86400000
const toUtc = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const fmt = (ms) => new Date(ms).toISOString().slice(0, 10)

export function addDays(date, days) {
  return fmt(toUtc(date) + days * DAY)
}

/** Same day `months` later, clamped to the month's end (31 Jan + 1 = 28/29 Feb). */
export function addMonths(date, months) {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return fmt(target.getTime())
}

export function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / DAY)
}

export function cycleMonths(cycle) {
  return BILLING_CYCLES[cycle]?.months || 1
}

/** The period one payment of `cycles` billing cycles covers, starting `from`. */
export function periodFor(from, cycle, cycles = 1) {
  const start = String(from).slice(0, 10)
  return { start, end: addDays(addMonths(start, cycleMonths(cycle) * cycles), -1) }
}

/**
 * @param {object|null} plan      hospital_subscriptions row
 * @param {object[]}    payments  that hospital's subscription_payments rows
 * @param {string}      today     'YYYY-MM-DD'
 */
export function subscriptionStanding(plan, payments = [], today) {
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const lastPayment = [...payments].sort((a, b) =>
    String(b.paid_on).localeCompare(String(a.paid_on))
  )[0] || null

  if (!plan) {
    return { status: 'no_plan', paidThrough: null, nextDue: null, daysLate: 0, cyclesOwed: 0, amountOwed: 0, totalPaid, lastPayment }
  }

  // Paid through the latest covered day; with no payments, nothing before
  // the plan's start date is owed.
  const latestEnd = payments.reduce(
    (max, p) => (!max || String(p.period_end) > max ? String(p.period_end).slice(0, 10) : max),
    null
  )
  const paidThrough = latestEnd && latestEnd >= plan.start_date ? latestEnd : null
  const nextDue = paidThrough ? addDays(paidThrough, 1) : String(plan.start_date).slice(0, 10)

  if (plan.status === 'paused' || plan.status === 'cancelled') {
    return { status: plan.status, paidThrough, nextDue, daysLate: 0, cyclesOwed: 0, amountOwed: 0, totalPaid, lastPayment }
  }

  if (nextDue > today) {
    return { status: 'paid', paidThrough, nextDue, daysLate: 0, cyclesOwed: 0, amountOwed: 0, totalPaid, lastPayment }
  }

  // Count every cycle that has started and not been paid for, up to today.
  const months = cycleMonths(plan.billing_cycle)
  let cyclesOwed = 0
  let cursor = nextDue
  while (cursor <= today && cyclesOwed < 120) {
    cyclesOwed++
    cursor = addMonths(nextDue, months * cyclesOwed)
  }
  const daysLate = daysBetween(nextDue, today)
  return {
    status: daysLate > Number(plan.grace_days ?? 7) ? 'overdue' : 'due',
    paidThrough,
    nextDue,
    daysLate,
    cyclesOwed,
    amountOwed: cyclesOwed * Number(plan.amount || 0),
    totalPaid,
    lastPayment,
  }
}

/** What one month of a plan is worth, to add plans of different cycles up. */
export function monthlyValue(plan) {
  if (!plan || plan.status !== 'active') return 0
  return Number(plan.amount || 0) / cycleMonths(plan.billing_cycle)
}
