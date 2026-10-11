import type { Context, MiddlewareHandler } from 'hono'
import type { RateLimitConfig } from '../../decorators/controller.js'

type MaybeAsync<T> = T | Promise<T>

interface RateLimitBucket {
  count: number
  resetAt: number
}

export interface MemoryRateLimitFactoryOptions {
  identifyClient: (context: Context) => MaybeAsync<string>
  maxBuckets?: number
  message?: string
  onLimit?: (
    context: Context,
    retryAfterSeconds: number
  ) => MaybeAsync<Response>
}

export type CreateMemoryRateLimit = (
  config: RateLimitConfig
) => MiddlewareHandler

const DEFAULT_MAX_BUCKETS = 10_000
const DEFAULT_MESSAGE = 'Too many requests'

export function createMemoryRateLimitFactory(
  options: MemoryRateLimitFactoryOptions
): CreateMemoryRateLimit {
  const maxBuckets = options.maxBuckets ?? DEFAULT_MAX_BUCKETS

  if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) {
    throw new TypeError('maxBuckets must be a positive integer')
  }

  const buckets = new Map<string, RateLimitBucket>()

  return (config) => {
    if (!config.keyPrefix) {
      throw new TypeError('keyPrefix must not be empty')
    }
    if (!Number.isInteger(config.max) || config.max <= 0) {
      throw new TypeError('max must be a positive integer')
    }
    if (!Number.isFinite(config.windowSeconds) || config.windowSeconds <= 0) {
      throw new TypeError('windowSeconds must be positive')
    }

    const windowMs = config.windowSeconds * 1000

    return async (context, next) => {
      const now = Date.now()
      const routeIdentity = await config.identify?.(context)
      const identity =
        routeIdentity === null || routeIdentity === undefined
          ? await options.identifyClient(context)
          : routeIdentity
      const key = JSON.stringify([config.keyPrefix, identity])
      const current = buckets.get(key)

      if (!current && buckets.size >= maxBuckets) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= now) {
            buckets.delete(bucketKey)
          }
        }

        if (buckets.size >= maxBuckets) {
          const nextResetAt = Math.min(
            ...Array.from(buckets.values(), (bucket) => bucket.resetAt)
          )
          return rateLimited(context, nextResetAt, now, options)
        }
      }

      const bucket =
        !current || current.resetAt <= now
          ? { count: 0, resetAt: now + windowMs }
          : current

      bucket.count += 1
      buckets.set(key, bucket)

      if (bucket.count > config.max) {
        return rateLimited(context, bucket.resetAt, now, options)
      }

      await next()
    }
  }
}

function rateLimited(
  context: Context,
  resetAt: number,
  now: number,
  options: MemoryRateLimitFactoryOptions
): MaybeAsync<Response> {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000))
  context.header('Retry-After', String(retryAfterSeconds))

  return options.onLimit
    ? options.onLimit(context, retryAfterSeconds)
    : context.json({ message: options.message ?? DEFAULT_MESSAGE }, 429)
}
