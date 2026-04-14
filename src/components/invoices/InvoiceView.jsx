'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Printer,
  Download,
  X
} from 'lucide-react'

export function InvoiceView({ invoice, hospital, patient, onClose }) {
  const printRef = useRef(null)
  // Support both payments and invoice_payments formats for backward compatibility
  const payments = invoice?.invoice_payments || invoice?.payments || []
  const paymentStatus = invoice?.payment_status || 'unpaid'

  const patientId = patient?.id || patient?.registration_no || 'N/A'
  const patientEmail = patient?.profile?.email || patient?.email || 'N/A'
  const patientPhone = patient?.profile?.mobile || patient?.mobile || 'N/A'
  const patientAddress = patient?.profile?.address || patient?.address || 'N/A'
  const patientCity = patient?.profile?.city || patient?.city || 'N/A'
  const patientState = patient?.profile?.state || patient?.state || 'N/A'
  const patientPincode = patient?.profile?.pincode || patient?.pincode || 'N/A'

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
                  {hospital?.city || 'N/A'}, {hospital?.state || 'N/A'} - {hospital?.pincode || 'N/A'}
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

        {/* PATIENT DETAILS */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '12px', borderBottom: '1px solid #000', paddingBottom: '5px', display: 'inline-block' }}>
            PATIENT DETAILS
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', fontSize: '11px', width: '35%' }}>Name:</td>
                <td style={{ padding: '4px 0', fontSize: '11px', fontWeight: 'bold' }}>
                  {patient?.profile?.name || patient?.name || 'N/A'}
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
        </div>

        {/* BILLING SUMMARY */}
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
                Subtotal
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
                <tr style={{ borderBottom: '2px solid #000' }}>
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

  const handleDownload = () => {
    const element = document.createElement('a')
    const file = new Blob([printRef.current.innerHTML], { type: 'text/html' })
    element.href = URL.createObjectURL(file)
    element.download = `invoice-${invoice?.id || 'N/A'}.html`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" onClick={handleDownload} className="h-9 px-4 gap-2" title="Download Invoice">
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button onClick={handlePrint} className="h-9 px-4 gap-2 bg-gray-900 hover:bg-gray-800" title="Print Invoice">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="h-9 w-9 p-0" title="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Invoice Display */}
      <div className="w-full border border-gray-300 rounded-lg overflow-auto max-h-[65vh] bg-white">
        <div className="p-4 md:p-6">
          {invoiceContent}
        </div>
      </div>

      {/* Hidden print content */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>{invoiceContent}</div>
      </div>
    </div>
  )
}
