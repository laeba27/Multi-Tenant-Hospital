// The invoice markup uses inline styles so it prints and downloads as a
// self-contained A4 document. Inline styles can't respond to screen width, so
// this sheet (rendered inside the invoice) restacks it on phones. It only
// kicks in below 640px, so print output and desktop view are unchanged.
export const INVOICE_RESPONSIVE_CSS = `
.inv-doc { overflow-wrap: anywhere; }
@media screen and (max-width: 640px) {
  .inv-doc { padding: 0 !important; }
  .inv-box { padding: 14px !important; }
  .inv-doc h1 { font-size: 18px !important; }
  .inv-doc h2 { font-size: 22px !important; }
  .inv-stack > tbody > tr > td {
    display: block !important;
    width: 100% !important;
    padding-right: 0 !important;
    text-align: left !important;
  }
  .inv-stack > tbody > tr > td + td { padding-top: 12px !important; }
  .inv-totals td { padding-left: 0 !important; padding-right: 0 !important; width: auto !important; }
  .inv-items th, .inv-items td { padding-left: 4px !important; padding-right: 4px !important; }
  .inv-items th:last-child { width: auto !important; }
}
`
