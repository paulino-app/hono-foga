import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  BAD_REQUEST,
  CONFLICT,
  NOT_FOUND,
  OK,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED
} from '../data/httpStatusCodes.js'
import {
  BAD_REQUEST_MESSAGE,
  CONFLICT_MESSAGE,
  NOT_FOUND_MESSAGE,
  TOO_MANY_REQUESTS_MESSAGE,
  UNAUTHORIZED_MESSAGE
} from '../data/httpStatusMessages.js'

const DEFAULT_RETRY_AFTER_MS = 15 * 60 * 1000

class Reply {
  static json(context: Context, data: unknown, statusCode: number = OK) {
    return context.json(data, statusCode as ContentfulStatusCode)
  }

  static ok(context: Context) {
    return context.json({ message: 'Success' }, OK)
  }

  static created(context: Context) {
    return context.json({ message: 'Created' }, OK)
  }

  static updated(context: Context) {
    return context.json({ message: 'Updated' }, OK)
  }

  static deleted(context: Context) {
    return context.json({ message: 'Deleted' }, OK)
  }

  static badRequest(context: Context) {
    return context.json({ message: BAD_REQUEST_MESSAGE }, BAD_REQUEST)
  }

  static conflict(context: Context) {
    return context.json({ message: CONFLICT_MESSAGE }, CONFLICT)
  }

  static notFound(context: Context) {
    return context.json({ message: NOT_FOUND_MESSAGE }, NOT_FOUND)
  }

  static tooManyRequests(
    context: Context,
    attemptStatus: { retryAfterSeconds?: number } = {}
  ) {
    const retryAfter =
      attemptStatus.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_MS
    context.header('Retry-After', retryAfter.toString())

    return context.json(
      { message: TOO_MANY_REQUESTS_MESSAGE, retryAfter },
      TOO_MANY_REQUESTS
    )
  }

  static unauthorized(context: Context) {
    return context.json({ message: UNAUTHORIZED_MESSAGE }, UNAUTHORIZED)
  }
}

export default Reply
