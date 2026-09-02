'use client'

import { BillingWorkspace } from '@/components/invoices/BillingWorkspace'

/**
 * Reception's billing screen.
 *
 * The whole screen now lives in BillingWorkspace, which gates on the
 * `manage_billing` permission rather than on the receptionist role -- so the
 * doctor route below mounts exactly the same code, and an admin who moves
 * billing between the two doesn't need either page changed.
 */
export default function ReceptionBillingPage() {
  return <BillingWorkspace />
}
