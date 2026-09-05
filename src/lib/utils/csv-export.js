/**
 * CSV export helpers.
 *
 * CSV rather than real .xlsx: Excel, Google Sheets and Numbers all open it
 * natively, and it needs no dependency, no licence and no server round trip --
 * the file is built in the browser from data the page already has.
 */

/**
 * Quote a single CSV field.
 *
 * Anything containing a comma, quote or newline has to be wrapped in quotes,
 * with inner quotes doubled -- otherwise one patient name with a comma in it
 * silently shifts every following column in the row.
 */
function escapeCell(value) {
  if (value === null || value === undefined) return ''

  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Build a CSV string from a header row and an array of row arrays. */
export function toCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

/**
 * Trigger a browser download of `content` as `filename`.
 *
 * The BOM is deliberate: without it Excel on Windows reads the file as ANSI and
 * mangles any non-ASCII text, which here means the rupee sign and patient names
 * turn into mojibake. Sheets and Numbers ignore it.
 */
export function downloadCsv(filename, content) {
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Revoking immediately can cancel the download in some browsers, so let the
  // click be handled first.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Today's date as YYYY-MM-DD, for filenames. */
export function dateStamp(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
