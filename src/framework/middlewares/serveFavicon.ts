import { readFile } from 'fs/promises'
import type { MiddlewareHandler } from 'hono'
import { NOT_FOUND } from '../../data/httpStatusCodes.js'

/**
 * Serves a favicon.ico from the given absolute path. Path is required because
 * each app keeps its asset somewhere different.
 */
export default function serveFavicon(filePath: string): MiddlewareHandler {
  return async (context, next) => {
    if (context.req.path !== '/favicon.ico') {
      return next()
    }

    try {
      const file = await readFile(filePath)
      return new Response(new Uint8Array(file), {
        headers: {
          'Content-Type': 'image/x-icon'
        }
      })
    } catch {
      return new Response('Favicon not found', { status: NOT_FOUND })
    }
  }
}
