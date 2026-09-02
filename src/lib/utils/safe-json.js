/**
 * Read a fetch Response as JSON without exploding on an HTML error page.
 *
 * When a route crashes, times out, or is hit while the deployment is rolling,
 * the platform answers with an HTML error page instead of JSON. A bare
 * `response.json()` on that page throws "Unexpected token '<' ... is not valid
 * JSON" -- the DOCTYPE error -- which tells the user nothing and hides the
 * status code that would have explained it.
 *
 * This returns a parsed body when there is one, and otherwise synthesises an
 * error object from the HTTP status so the caller can show something true.
 */
export async function readJsonResponse(response) {
  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    console.error(
      `Expected JSON from ${response.url} but got ${response.status} ` +
        `${response.headers.get('content-type') || 'unknown content-type'}:`,
      text.slice(0, 500)
    )

    return {
      error:
        response.status >= 500
          ? 'The server had a problem completing this request. Please try again in a moment.'
          : `Request failed (${response.status}). Please try again.`,
    }
  }
}
