import type { MiddlewareHandler } from 'hono'

export interface ServeRobotsOptions {
  path?: string
  content?: string
}

export default function serveRobots(
  options: ServeRobotsOptions = {}
): MiddlewareHandler {
  const { path = '/robots.txt', content = 'User-agent: *\nDisallow: /' } =
    options

  return async (context, next) => {
    if (context.req.path === path) {
      return context.text(content, 200, {
        'Content-Type': 'text/plain; charset=UTF-8'
      })
    }

    return next()
  }
}
