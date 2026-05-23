import type { MiddlewareHandler } from 'hono'

export default function serveRobots(): MiddlewareHandler {
  return async (context, next) => {
    if (context.req.path === '/robots.txt') {
      context.header('Content-Type', 'text/plain')
      return context.text('User-agent: *\nDisallow: /')
    }

    return next()
  }
}
