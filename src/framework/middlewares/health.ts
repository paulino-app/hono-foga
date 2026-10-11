import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { OK, SERVICE_UNAVAILABLE } from '../../data/httpStatusCodes.js'

export type HealthCheck = (context: Context) => unknown | Promise<unknown>

export interface HealthDependencyResult {
  status: 'ok' | 'error'
  durationMs: number
  data?: unknown
  error?: string
}

export type HealthDependencies = Record<string, HealthDependencyResult>

export interface HealthStatus {
  status: string
  statusCode: ContentfulStatusCode
}

export interface HealthOptions {
  path?: string
  version?: string
  checks?: Record<string, HealthCheck>
  timeoutMs?: number
  exposeErrors?: boolean
  deriveStatus?: (dependencies: HealthDependencies) => HealthStatus
}

async function runCheck(
  check: HealthCheck,
  context: Context,
  timeoutMs: number,
  exposeErrors: boolean
): Promise<HealthDependencyResult> {
  const startedAt = Date.now()
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const data = await Promise.race([
      check(context),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(new Error(`Health check timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      })
    ])

    return {
      status: 'ok',
      durationMs: Date.now() - startedAt,
      data
    }
  } catch (error) {
    return {
      status: 'error',
      durationMs: Date.now() - startedAt,
      error:
        exposeErrors && error instanceof Error
          ? error.message
          : 'Dependency unavailable'
    }
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

export function createHealth(options: HealthOptions = {}): MiddlewareHandler {
  const {
    path = '/health',
    version,
    checks = {},
    timeoutMs = 5000,
    exposeErrors = false,
    deriveStatus
  } = options
  const startedAt = new Date()

  return async (context, next) => {
    if (context.req.path !== path) {
      return next()
    }

    const dependencies = Object.fromEntries(
      await Promise.all(
        Object.entries(checks).map(async ([name, check]) => {
          const result = await runCheck(check, context, timeoutMs, exposeErrors)
          return [name, result] as const
        })
      )
    )
    const defaultStatus: HealthStatus = Object.values(dependencies).some(
      (dependency) => dependency.status === 'error'
    )
      ? { status: 'error', statusCode: SERVICE_UNAVAILABLE }
      : { status: 'ok', statusCode: OK }
    const healthStatus = deriveStatus?.(dependencies) ?? defaultStatus
    const uptimeInSeconds = process.uptime()

    return context.json(
      {
        status: healthStatus.status,
        uptime: {
          seconds: uptimeInSeconds,
          human: new Date(uptimeInSeconds * 1000).toISOString().slice(11, 19),
          startedAt: startedAt.toISOString()
        },
        dependencies,
        version
      },
      healthStatus.statusCode
    )
  }
}

export default createHealth
