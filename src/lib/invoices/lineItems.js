/**
 * The itemised rows of an invoice -- Date | Treatment / Service | Amount --
 * rebuilt from the appointment it was raised for.
 *
 * Invoices store only totals; the breakdown lives on the appointment
 * (`consultation_fee_snapshot` + `treatment_details`). If those parts don't add
 * up to the invoice subtotal (a manual invoice, or an appointment edited after
 * billing), a single row carrying the invoice's purpose is returned instead, so
 * the table never contradicts the totals beneath it.
 */
export function buildInvoiceLineItems(invoice, appointment) {
  const subtotal = parseFloat(invoice?.subtotal || 0)
  const date = formatDate(appointment?.appointment_date || invoice?.created_at)
  const doctorName =
    appointment?.doctor_name || appointment?.doctors?.name || appointment?.doctor?.name || null

  const items = []
  const consultationFee = parseFloat(appointment?.consultation_fee_snapshot || 0)
  if (consultationFee > 0) {
    items.push({
      date,
      label: 'Consultation Fee',
      detail: doctorName ? `Dr. ${doctorName}` : null,
      amount: consultationFee,
    })
  }

  const treatments = Array.isArray(appointment?.treatment_details) ? appointment.treatment_details : []
  treatments.forEach((t) => {
    const price = parseFloat(t?.price || 0)
    const discount = parseFloat(t?.discount || 0)
    items.push({
      date,
      label: t?.name || 'Treatment',
      detail: discount > 0 ? `₹${price.toFixed(2)} less ₹${discount.toFixed(2)} discount` : null,
      amount: price - discount,
    })
  })

  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0)
  if (items.length > 0 && Math.abs(itemsTotal - subtotal) < 0.01) return items

  return [{ date, label: invoice?.description || 'Charges', detail: null, amount: subtotal }]
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
