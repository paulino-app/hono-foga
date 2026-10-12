/**
 * Global error handler. Factory takes the runtime mode so we can hide stack
 * traces in production. The package stays free of environment lookups.
 */
import type { Context, ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { INTERNAL_SERVER_ERROR } from '../../data/httpStatusCodes.js'
import { INTERNAL_SERVER_ERROR_MESSAGE } from '../../data/httpStatusMessages.js'

interface ErrorWithStatus extends Error {
  status?: number
  expose?: boolean
}

export interface ErrorReport {
  error: Error
  context: Context
  status: StatusCode
}

export interface OnErrorOptions {
  mode?: string
  exposeErrors?: boolean
  report?: (details: ErrorReport) => void | Promise<void>
}

export function createOnError(options: OnErrorOptions = {}): ErrorHandler {
  const exposeErrors = options.exposeErrors ?? options.mode === 'development'

  return async (err, context: Context) => {
    const e = err as ErrorWithStatus

    if (exposeErrors) {
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

    if (
      e instanceof HTTPException &&
      (e.status < INTERNAL_SERVER_ERROR ||
        exposeErrors ||
        (e as ErrorWithStatus).expose === true)
    ) {
      return e.res
        ? e.getResponse()
        : context.json({ message: e.message }, e.status)
    }

    const errorMessage = !exposeErrors
      ? INTERNAL_SERVER_ERROR_MESSAGE
      : e.message || INTERNAL_SERVER_ERROR_MESSAGE

    return context.json(
      { message: errorMessage },
      statusCode as ContentfulStatusCode
    )
  }
}
