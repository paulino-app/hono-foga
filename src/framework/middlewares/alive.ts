import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { OK } from '../../data/httpStatusCodes.js'
import { OK_MESSAGE } from '../../data/httpStatusMessages.js'

type AliveBody = unknown | ((context: Context) => unknown | Promise<unknown>)

export interface AliveOptions {
  path?: string
  status?: ContentfulStatusCode
  body?: AliveBody
}

export function createAlive(options: AliveOptions = {}): MiddlewareHandler {
  const {
    path = '/alive',
    status = OK,
    body = { message: OK_MESSAGE }
  } = options

  return async (context, next) => {
    if (context.req.path !== path) {
      return next()
    }

    const responseBody = typeof body === 'function' ? await body(context) : body
    return context.json(responseBody as any, status)
  }
}

export default createAlive
