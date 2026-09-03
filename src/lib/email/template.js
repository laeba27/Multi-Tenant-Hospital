/**
 * One layout for every email the product sends.
 *
 * Each sender used to carry its own hand-written <style> block, so the seven
 * emails drifted apart: indigo headers in some, black in others, a green one,
 * three different footers, and two that printed a raw 400-character JWT link
 * straight into the body -- which wrapped across seven lines and looked broken.
 * Building each message from these helpers means a change to the brand happens
 * once, and no email can quietly diverge again.
 *
 * Email HTML is not web HTML. The rules that shape everything below:
 *   - No <style> block. Gmail keeps it, but Outlook and several mobile clients
 *     drop or mangle it, which is exactly how a design falls apart in the one
 *     client you did not test. Every rule here is an inline style attribute.
 *   - Tables, not flexbox or grid. Word renders Outlook's HTML and supports
 *     neither.
 *   - Explicit hex colours everywhere. A client with a dark theme will
 *     otherwise recolour text and leave it unreadable on our light panels.
 */

const BRAND = {
  indigo: '#4f46e5',
  ink: '#111827',
  body: '#374151',
  muted: '#6b7280',
  faint: '#9ca3af',
  border: '#e5e7eb',
  panel: '#f9fafb',
  page: '#f3f4f6',
  white: '#ffffff',
  amber: '#b45309',
  amberBg: '#fffbeb',
  amberBorder: '#fcd34d',
  green: '#15803d',
  greenBg: '#f0fdf4',
  greenBorder: '#86efac',
}

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO = "'SF Mono', Menlo, Consolas, 'Courier New', monospace"

/**
 * Absolute URL of the logo for use in email.
 *
 * Mail clients have no page context, so a relative path resolves to nothing.
 * This mirrors appUrl() in send-email.js, including the production fallback, so
 * a deployment missing NEXT_PUBLIC_APP_URL still shows the logo rather than a
 * broken-image icon.
 */
function logoUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://multi-tenant-hospital.vercel.app'
      : 'http://localhost:3000')
  return `${base.replace(/\/$/, '')}/logo-mark.png`
}

/** The year shown in the footer -- never a hardcoded one that silently ages. */
function currentYear() {
  return new Date().getFullYear()
}

/**
 * A primary call-to-action.
 *
 * Built as a table rather than a padded <a>: Outlook ignores padding on inline
 * elements and would collapse the button to bare underlined text.
 */
export function button(label, href, color = BRAND.indigo) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr>
        <td align="center" bgcolor="${color}" style="border-radius:6px;">
          <a href="${href}"
             style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:15px;font-weight:600;color:${BRAND.white};text-decoration:none;border-radius:6px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

/**
 * The fallback line under a button.
 *
 * A tokened URL can run to 400+ characters, and printing it as link text is
 * what made the reset email look broken. The anchor text is short and fixed
 * while the href carries the real URL, so the message stays tidy and the link
 * still works for anyone who cannot use the button. `word-break` keeps a long
 * URL inside the panel in clients that expand it anyway.
 */
export function linkFallback(href, label = 'Open the link') {
  return `
    <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;color:${BRAND.muted};line-height:1.6;">
      Button not working? <a href="${href}" style="color:${BRAND.indigo};text-decoration:underline;word-break:break-all;">${label}</a>
    </p>`
}

/** A labelled reference code, monospaced so it can be read and typed back. */
export function codeRow(label, value) {
  return `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font-family:${FONT};font-size:13px;color:${BRAND.muted};">${label}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font-family:${MONO};font-size:13px;color:${BRAND.ink};text-align:right;font-weight:600;">${value}</td>
    </tr>`
}

/** Wrap codeRow() entries in the table they belong to. */
export function detailsTable(rows) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;border-collapse:collapse;">
      ${rows}
    </table>`
}

/** A callout panel: 'info' (amber) for waiting, 'success' (green) for done. */
export function notice(html, tone = 'info') {
  const tones = {
    info: { bg: BRAND.amberBg, border: BRAND.amberBorder, text: BRAND.amber },
    success: { bg: BRAND.greenBg, border: BRAND.greenBorder, text: BRAND.green },
  }
  const t = tones[tone] || tones.info
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;">
      <tr>
        <td style="background:${t.bg};border-left:3px solid ${t.border};border-radius:4px;padding:14px 16px;font-family:${FONT};font-size:14px;color:${t.text};line-height:1.6;">
          ${html}
        </td>
      </tr>
    </table>`
}

/** Body copy. */
export function p(html, extra = '') {
  return `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;color:${BRAND.body};line-height:1.65;${extra}">${html}</p>`
}

/** The small print under the main message. */
export function fineprint(html) {
  return `<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;color:${BRAND.muted};line-height:1.6;">${html}</p>`
}

/**
 * Wrap content in the shared shell: header, white card, footer.
 *
 * @param {object}  opts
 * @param {string}  opts.title    Headline inside the indigo header.
 * @param {string}  opts.content  Pre-built HTML for the card body.
 * @param {string} [opts.preheader] The grey line clients preview next to the
 *   subject. Left unset, they scrape the first words of the body instead, which
 *   reads like a fragment.
 */
export function layout({ title, content, preheader = '' }) {
  const year = currentYear()

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-font-smoothing:antialiased;">
  <!-- Preview text: shown in the inbox list, hidden in the message itself. -->
  <div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheader}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND.indigo};border-radius:8px 8px 0 0;padding:26px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!--
                    The logo is referenced by absolute URL, not attached as a CID
                    part: Gmail's web client is unreliable with CID images, and an
                    attachment also shows up as a paperclip on the message. The
                    file is served from /logo-mark.png on the public site.
                    Fixed width/height attributes matter -- Outlook ignores CSS
                    sizing on <img> and would otherwise render it at full size.
                  -->
                  <td style="padding-right:12px;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#ffffff" align="center" valign="middle"
                            style="width:44px;height:44px;border-radius:10px;">
                          <img src="${logoUrl()}" width="32" height="32" alt=""
                               style="display:block;width:32px;height:32px;border:0;outline:none;text-decoration:none;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:${FONT};font-size:13px;font-weight:600;letter-spacing:0.5px;color:#e0e7ff;">
                      Smile Return
                    </p>
                  </td>
                </tr>
              </table>
              <h1 style="margin:18px 0 0;font-family:${FONT};font-size:21px;font-weight:600;color:${BRAND.white};line-height:1.3;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${BRAND.white};padding:32px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${BRAND.panel};border:1px solid ${BRAND.border};border-top:0;border-radius:0 0 8px 8px;padding:22px 32px;">
              <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;color:${BRAND.muted};line-height:1.6;">
                Smile Return Hospital Management System
              </p>
              <p style="margin:0;font-family:${FONT};font-size:12px;color:${BRAND.faint};line-height:1.6;">
                This is an automated message &mdash; please do not reply.<br />
                &copy; ${year} Smile Return. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export { BRAND, FONT, MONO, currentYear, logoUrl }
