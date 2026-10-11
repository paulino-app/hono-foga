import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { OK } from '../../data/httpStatusCodes.js'

type AboutInfo = unknown | ((context: Context) => unknown | Promise<unknown>)

export interface AboutOptions {
  info: AboutInfo
  path?: string
  status?: ContentfulStatusCode
}

export function createAbout(options: AboutOptions): MiddlewareHandler {
  const { info, path = '/', status = OK } = options

  return async (context, next) => {
    if (context.req.path !== path) {
      return next()
    }

    const responseBody = typeof info === 'function' ? await info(context) : info
    return context.json(responseBody as any, status)
  }
}

export default createAbout
