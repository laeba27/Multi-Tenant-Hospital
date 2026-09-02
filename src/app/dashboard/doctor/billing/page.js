'use client'

import { BillingWorkspace } from '@/components/invoices/BillingWorkspace'

/**
 * A doctor's billing screen -- the same one reception uses.
 *
 * Doctors hold no billing rights by default; this route is only reachable, and
 * only functional, once an admin grants `manage_billing` on the RBAC page. The
 * component checks the permission on mount and every write re-checks it on the
 * server, so the route existing grants nothing on its own.
 */
export default function DoctorBillingPage() {
  return <BillingWorkspace />
}
