/**
 * Global error handler. Factory takes the runtime mode so we can hide stack
 * traces in production. The package stays free of environment lookups.
 */
import type { Context, ErrorHandler } from 'hono'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { INTERNAL_SERVER_ERROR, OK } from '../../data/httpStatusCodes.js'
import { INTERNAL_SERVER_ERROR_MESSAGE } from '../../data/httpStatusMessages.js'

interface ErrorWithStatus extends Error {
  status?: number
}

export interface OnErrorOptions {
  mode?: string
}

export function createOnError(options: OnErrorOptions = {}): ErrorHandler {
  const isDevelopment = options.mode !== 'production'

  return (err, context: Context) => {
    const e = err as ErrorWithStatus

    if (isDevelopment) {
      console.error('Error capturado:', e)
    }

    const currentStatus = e.status ?? context.newResponse(null).status
    const statusCode: StatusCode =
      currentStatus !== OK
        ? (currentStatus as StatusCode)
        : INTERNAL_SERVER_ERROR

    const errorMessage = e.message || INTERNAL_SERVER_ERROR_MESSAGE

    return context.json(
      {
        message: errorMessage,
        stack: isDevelopment ? e.stack : undefined
      },
      statusCode as ContentfulStatusCode
    )
  }
}
