/**
 * IP based rate limiting backed by Redis. The factory takes the redis client
 * and the limits so the package stays decoupled from any specific config layer.
 */
import type { Context, MiddlewareHandler } from 'hono'
import type Redis from 'ioredis'
import getIPAddress from '../../network/getIP.js'
import { TOO_MANY_REQUESTS } from '../../data/httpStatusCodes.js'
import { TOO_MANY_REQUESTS_MESSAGE } from '../../data/httpStatusMessages.js'

export interface RateLimitOptions {
  redis: Redis | null | undefined
  windowSeconds: number
  maxRequests: number
  mode?: string
  developmentIp?: string
}

function getClientIP(context: Context, options: RateLimitOptions): string {
  if (options.mode === 'development') {
    return options.developmentIp ?? '127.0.0.1'
  }
  return getIPAddress(context) ?? 'unknown'
}

export default function rateLimit(
  options: RateLimitOptions
): MiddlewareHandler {
  const { redis, windowSeconds, maxRequests: defaultMaxRequests } = options

  return async (context, next) => {
    if (!redis) {
      return next()
    }

    try {
      const clientIP = getClientIP(context, options)
      const key = `rate_limit:${clientIP}`
      const maxRequestsKey = `rate_limit:max:${clientIP}`

      const userMaxRequestsStr = await redis.get(maxRequestsKey)
      const maxRequests = userMaxRequestsStr
        ? parseInt(userMaxRequestsStr, 10)
        : defaultMaxRequests

      const current = await redis.get(key)

      if (current === null) {
        await redis.setex(key, windowSeconds, '1')
        return next()
      }

      const count = parseInt(current, 10)

      if (count >= maxRequests) {
        const ttl = await redis.ttl(key)
        return context.json(
          { message: TOO_MANY_REQUESTS_MESSAGE, retryAfter: ttl },
          TOO_MANY_REQUESTS
        )
      }

      await redis.incr(key)
      return next()
    } catch (error) {
      console.error('Rate limit error:', error)
      return next()
    }
  }
}
