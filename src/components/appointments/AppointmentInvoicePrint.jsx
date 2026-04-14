'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Check, X } from 'lucide-react'

export function AppointmentInvoicePrint({ invoice, hospital, patient, appointment, doctor }) {
  const printRef = useRef(null)
  const [showInvoice, setShowInvoice] = useState(false)

  const payments = invoice?.payments || []
  const doctorName = doctor?.name || appointment?.doctor_name || 'N/A'
  const patientId = patient?.registration_no || patient?.profile?.registration_no || patient?.id || 'N/A'
  const patientEmail = patient?.email || patient?.profile?.email || 'N/A'
  const patientPhone = patient?.mobile || patient?.profile?.mobile || 'N/A'
  const patientAddress = patient?.profile?.address || patient?.address || 'N/A'
  const patientCity = patient?.profile?.city || patient?.city || 'N/A'
  const patientState = patient?.profile?.state || patient?.state || 'N/A'
  const patientPincode = patient?.profile?.pincode || patient?.pincode || 'N/A'

  const appointmentDate = appointment?.appointment_date
    ? new Date(appointment?.appointment_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'N/A'
  const appointmentTime = appointment?.appointment_slot || 'N/A'

  const invoiceDate = invoice?.created_at
    ? new Date(invoice?.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'N/A'

  const invoiceDateTime = invoice?.created_at
    ? new Date(invoice?.created_at).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A'

  const paymentStatus = invoice?.payment_status || 'unpaid'

  const invoiceContent = (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.4', color: '#000', textTransform: 'uppercase', margin: '0' }}>

      {/* Main Container */}
      <div style={{ border: '1px solid #000', padding: '30px' }}>

        {/* HEADER */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ width: '60%', verticalAlign: 'top', paddingBottom: '15px', textTransform: 'uppercase' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  {hospital?.name || 'Hospital Name'}
                </h1>
                <p style={{ margin: '2px 0', fontSize: '11px' }}>
                  Registration No: <strong>{hospital?.registration_no || 'N/A'}</strong>
                </p>
                <p style={{ margin: '2px 0', fontSize: '11px' }}>
                  {hospital?.address || 'N/A'}
                </p>
                <p style={{ margin: '2px 0', fontSize: '11px' }}>
                  {hospital?.city || 'N/A'}, {hospital?.state || 'N/A'} - {hospital?.postal_code || 'N/A'}
                </p>
                <p style={{ margin: '2px 0', fontSize: '11px' }}>
                  Phone: <strong>{hospital?.phone || 'N/A'}</strong>
                </p>
                <p style={{ margin: '2px 0', fontSize: '11px' }}>
                  Email: {hospital?.email || 'N/A'}
                </p>
              </td>
              <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'right', paddingBottom: '15px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0', letterSpacing: '2px' }}>
                  INVOICE
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Invoice No:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                        {invoice?.id || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Date:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px', textAlign: 'right' }}>
                        {invoiceDate}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Status:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                        {paymentStatus.replace('_', ' ')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* LINE */}
        <div style={{ borderTop: '2px solid #000', marginBottom: '20px' }}></div>

        {/* PATIENT & APPOINTMENT DETAILS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '20px' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '12px', borderBottom: '1px solid #000', paddingBottom: '5px', display: 'inline-block' }}>
                  PATIENT DETAILS
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px', width: '35%' }}>Name:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px', fontWeight: 'bold' }}>
                        {patient?.name || patient?.profile?.name || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Patient ID:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{patientId}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Phone:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{patientPhone}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Email:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{patientEmail}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Address:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{patientAddress}, {patientCity} {patientState} {patientPincode}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '12px', borderBottom: '1px solid #000', paddingBottom: '5px', display: 'inline-block' }}>
                  APPOINTMENT DETAILS
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px', width: '40%' }}>Appointment ID:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{appointment?.id || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Doctor:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px', fontWeight: 'bold' }}>Dr. {doctorName}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Department:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{appointment?.department_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Date & Time:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{appointmentDate} at {appointmentTime}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>Purpose:</td>
                      <td style={{ padding: '4px 0', fontSize: '11px' }}>{appointment?.appointment_type || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* LINE */}
        <div style={{ borderTop: '1px solid #000', marginBottom: '20px' }}></div>

        {/* BILLING TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>
                Description
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', width: '150px' }}>
                Amount (INR)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <td style={{ padding: '10px 8px', fontSize: '11px' }}>
                Consultation Fee ({appointment?.appointment_type || 'General'})
              </td>
              <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                ₹{parseFloat(invoice?.subtotal || 0).toFixed(2)}
              </td>
            </tr>
            {parseFloat(invoice?.tax_amount || 0) > 0 && (
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '10px 8px', fontSize: '11px' }}>Tax (2.5%)</td>
                <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'right' }}>
                  ₹{parseFloat(invoice?.tax_amount || 0).toFixed(2)}
                </td>
              </tr>
            )}
            {parseFloat(invoice?.discount_amount || 0) > 0 && (
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: '10px 8px', fontSize: '11px' }}>
                  Discount ({invoice?.discount_type === 'percentage' ? `${invoice?.discount_value}%` : 'Fixed'})
                </td>
                <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'right' }}>
                  -₹{parseFloat(invoice?.discount_amount || 0).toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* TOTALS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', marginLeft: 'auto' }}>
          <tbody>
            <tr style={{ borderTop: '2px solid #000' }}>
              <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '150px' }}>
                Total Amount:
              </td>
              <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', width: '120px' }}>
                ₹{parseFloat(invoice?.total_amount || 0).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 20px', textAlign: 'right', fontSize: '11px' }}>
                Paid Amount:
              </td>
              <td style={{ padding: '6px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>
                ₹{parseFloat(invoice?.paid_amount || 0).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 20px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                Due Amount:
              </td>
              <td style={{ padding: '6px 20px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                ₹{parseFloat(invoice?.due_amount || 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* PAYMENT BREAKDOWN */}
        {payments.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid #000', marginBottom: '15px', marginTop: '20px' }}></div>
            <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '12px', borderBottom: '1px solid #000', paddingBottom: '5px', display: 'inline-block' }}>
              Payment Breakdown
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold' }}>
                    Date
                  </th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold' }}>
                    Method
                  </th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold' }}>
                    Reference
                  </th>
                  <th style={{ padding: '8px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr key={`${payment.payment_method}-${index}`} style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '8px', fontSize: '11px' }}>
                      {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-IN') : invoiceDate}
                    </td>
                    <td style={{ padding: '8px', fontSize: '11px' }}>
                      {payment.payment_method || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', fontSize: '11px' }}>{payment.reference_id || '-'}</td>
                    <td style={{ padding: '8px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                      ₹{parseFloat(payment.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* LINE */}
        <div style={{ borderTop: '1px solid #000', marginBottom: '15px', marginTop: '20px' }}></div>

        {/* NOTES */}
        <div style={{ marginBottom: '15px' }}>
          {invoice?.notes && (
            <p style={{ margin: '0 0 8px 0', fontSize: '11px' }}>
              <strong>Notes:</strong> {invoice.notes}
            </p>
          )}
          <p style={{ margin: 0, fontSize: '11px', fontStyle: 'italic' }}>
            This Is A Computer-Generated Invoice And Does Not Require A Physical Signature.
          </p>
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #000', paddingTop: '15px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '11px', fontWeight: 'bold' }}>
            Thank You For Your Visit. Please Keep This Invoice For Your Records.
          </p>
          <p style={{ margin: 0, fontSize: '10px' }}>
            Generated On {invoiceDateTime}
          </p>
        </div>

      </div>
    </div>
  )

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML
    const originalContents = document.body.innerHTML
    document.body.innerHTML = printContents
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
          <Check className="w-6 h-6 text-gray-700" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Process Complete</h3>
        <p className="text-sm text-gray-600">Patient registration, appointment, and billing are complete.</p>
      </div>

      <div className="flex w-full gap-3">
        <Button
          variant="outline"
          onClick={() => setShowInvoice((prev) => !prev)}
          className="flex-1"
        >
          {showInvoice ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Hide
            </>
          ) : (
            'View Invoice'
          )}
        </Button>
        <Button onClick={handlePrint} className="flex-1 bg-gray-900 hover:bg-gray-800">
          <Printer className="w-4 h-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      {showInvoice && (
        <div className="w-full border border-gray-300 rounded-lg overflow-auto max-h-96 bg-white">
          {invoiceContent}
        </div>
      )}

      <div style={{ display: 'none' }}>
        <div ref={printRef}>{invoiceContent}</div>
      </div>
    </div>
  )
}
