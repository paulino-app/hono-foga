import type { Context } from 'hono'
/**
 * Evita cachear respuestas que contienen tokens.
 */
function setNoStoreHeaders(context: Context): void {
  context.header('Cache-Control', 'no-store')
  context.header('Pragma', 'no-cache')
  context.header('Expires', '0')
}

export default setNoStoreHeaders
