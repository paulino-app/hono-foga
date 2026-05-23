import type { Context } from 'hono'
import type Redis from 'ioredis'
import getIPAddress from '../network/getIP.js'

export type LoginAttemptContext = Pick<Context, 'req'>

export interface LoginAttemptsOptions {
  redis: Redis | null | undefined
  maxAttempts: number
  timeWindowSeconds: number
}

export interface LoginAttemptsApi {
  getLoginAttemptIdentity: (
    context: LoginAttemptContext,
    email: string
  ) => string
  checkLoginAttempts: (identity: string) => Promise<{
    blocked: boolean
    retryAfterSeconds?: number
  }>
  incrementFailedAttempts: (identity: string) => Promise<void>
  clearFailedAttempts: (identity: string) => Promise<void>
}

/**
 * Builds a small client for redis backed login throttling. Returns a single
 * object with the four operations a consumer typically calls during auth.
 */
export function createLoginAttempts(
  options: LoginAttemptsOptions
): LoginAttemptsApi {
  const { redis, maxAttempts, timeWindowSeconds } = options

  function getLoginAttemptIdentity(
    context: LoginAttemptContext,
    email: string
  ): string {
    const ip = getIPAddress(context as Context) ?? 'unknown'
    return `${ip}:${email}`
  }

  async function checkLoginAttempts(identity: string) {
    if (!redis) {
      return { blocked: false }
    }

    const key = `login_attempts:${identity}`
    const attempts = await redis.get(key)
    const currentAttempts = attempts ? parseInt(attempts, 10) : 0

    if (currentAttempts >= maxAttempts) {
      const ttl = await redis.ttl(key)
      return {
        blocked: true,
        retryAfterSeconds: ttl > 0 ? ttl : timeWindowSeconds
      }
    }

    return { blocked: false }
  }

  async function incrementFailedAttempts(identity: string) {
    if (!redis) {
      return
    }

    const key = `login_attempts:${identity}`
    const attempts = await redis.incr(key)
    if (attempts === 1) {
      await redis.expire(key, timeWindowSeconds)
    }
  }

  async function clearFailedAttempts(identity: string) {
    if (!redis) {
      return
    }

    const key = `login_attempts:${identity}`
    await redis.del(key)
  }

  return {
    getLoginAttemptIdentity,
    checkLoginAttempts,
    incrementFailedAttempts,
    clearFailedAttempts
  }
}
