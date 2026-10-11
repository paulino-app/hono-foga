import { HTTPException } from 'hono/http-exception'
import type { Context } from '../../types.js'

/**
 * Reads the `:id` route param and returns it as a finite integer. Throws
 * a 400 if the param is missing or non-numeric — the global onError handler
 * turns that into a proper JSON response, so callers can just use the number.
 */
export function idParam(context: Context): number {
  const raw = context.req.param('id')
  const parsed = parseInt(raw ?? '', 10)
  if (!Number.isFinite(parsed)) {
    throw new HTTPException(400, { message: 'Invalid id parameter' })
  }
  return parsed
}
