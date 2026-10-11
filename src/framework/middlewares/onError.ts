/**
 * Global error handler. Factory takes the runtime mode so we can hide stack
 * traces in production. The package stays free of environment lookups.
 */
import type { Context, ErrorHandler } from 'hono'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { INTERNAL_SERVER_ERROR } from '../../data/httpStatusCodes.js'
import { INTERNAL_SERVER_ERROR_MESSAGE } from '../../data/httpStatusMessages.js'

interface ErrorWithStatus extends Error {
  status?: number
}

export interface ErrorReport {
  error: Error
  context: Context
  status: StatusCode
}

export interface OnErrorOptions {
  mode?: string
  report?: (details: ErrorReport) => void | Promise<void>
}

export function createOnError(options: OnErrorOptions = {}): ErrorHandler {
  const isDevelopment = options.mode !== 'production'

  return async (err, context: Context) => {
    const e = err as ErrorWithStatus

    if (isDevelopment) {
      console.error('Error capturado:', e)
    }

    const statusCode: StatusCode =
      Number.isInteger(e.status) && e.status! >= 400 && e.status! <= 599
        ? (e.status as StatusCode)
        : INTERNAL_SERVER_ERROR

    try {
      await options.report?.({ error: e, context, status: statusCode })
    } catch (reportError) {
      console.error('Error reporter failed:', reportError)
    }

    const errorMessage =
      !isDevelopment && statusCode >= INTERNAL_SERVER_ERROR
        ? INTERNAL_SERVER_ERROR_MESSAGE
        : e.message || INTERNAL_SERVER_ERROR_MESSAGE

    return context.json(
      { message: errorMessage },
      statusCode as ContentfulStatusCode
    )
  }
}
