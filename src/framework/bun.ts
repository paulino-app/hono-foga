import { serve, type Server } from 'bun'
import type { AppOpenAPI } from './types.js'

type MaybePromise<T> = T | Promise<T>

export type ShutdownSignal = 'SIGINT' | 'SIGTERM'

export interface GracefulShutdownOptions {
  timeoutMs?: number
  signals?: readonly ShutdownSignal[]
  cleanup?: () => MaybePromise<void>
  onSignal?: (signal: ShutdownSignal) => MaybePromise<void>
  onError?: (error: unknown) => MaybePromise<void>
}

export interface ServeAppOptions {
  port: number
  hostname?: string
  shutdown?: false | GracefulShutdownOptions
}

interface StoppableServer {
  stop(closeActiveConnections?: boolean): Promise<void>
}

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000
const DEFAULT_SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const

async function invokeShutdownErrorHandler(
  error: unknown,
  onError?: GracefulShutdownOptions['onError']
): Promise<void> {
  if (!onError) {
    console.error('Graceful shutdown failed:', error)
    return
  }

  try {
    await onError(error)
  } catch (reportError) {
    console.error('Graceful shutdown error handler failed:', reportError)
  }
}

async function reportShutdownError(
  error: unknown,
  onError?: GracefulShutdownOptions['onError']
): Promise<void> {
  process.exitCode = 1
  await invokeShutdownErrorHandler(error, onError)
}

export function createGracefulShutdown(
  server: StoppableServer,
  options: GracefulShutdownOptions = {}
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('shutdown timeoutMs must be a positive integer')
  }

  let shutdownPromise: Promise<void> | undefined

  return (signal: ShutdownSignal): Promise<void> => {
    shutdownPromise ??= (async () => {
      try {
        void Promise.resolve(options.onSignal?.(signal)).catch((error) =>
          invokeShutdownErrorHandler(error, options.onError)
        )
      } catch (error) {
        void invokeShutdownErrorHandler(error, options.onError)
      }

      let forceStopTimer: ReturnType<typeof setTimeout> | undefined
      const forceStop = new Promise<void>((resolve, reject) => {
        forceStopTimer = setTimeout(() => {
          server.stop(true).then(resolve, reject)
        }, timeoutMs)
      })

      let stopError: unknown
      try {
        await Promise.race([server.stop(false), forceStop])
      } catch (error) {
        stopError = error
      } finally {
        clearTimeout(forceStopTimer)
      }

      if (stopError) {
        try {
          await server.stop(true)
        } catch (forceStopError) {
          stopError = new AggregateError(
            [stopError, forceStopError],
            'Graceful and forced server stop failed'
          )
        }
      }

      try {
        await options.cleanup?.()
      } catch (cleanupError) {
        if (stopError) {
          throw new AggregateError(
            [stopError, cleanupError],
            'Server stop and shutdown cleanup failed'
          )
        }
        throw cleanupError
      }

      if (stopError) {
        throw stopError
      }
    })()

    return shutdownPromise
  }
}

export function serveApp(
  app: AppOpenAPI,
  options: ServeAppOptions
): Server<undefined> {
  const { shutdown: shutdownOptions, ...serverOptions } = options
  const server = serve({ fetch: app.fetch, ...serverOptions })

  if (shutdownOptions !== false && shutdownOptions !== undefined) {
    const shutdown = createGracefulShutdown(server, shutdownOptions)
    const signals = new Set(shutdownOptions.signals ?? DEFAULT_SHUTDOWN_SIGNALS)
    const handlers = new Map<ShutdownSignal, () => void>()
    const unregister = () => {
      for (const [signal, handler] of handlers) {
        process.off(signal, handler)
      }
    }

    for (const signal of signals) {
      const handler = () => {
        void shutdown(signal)
          .catch((error) => reportShutdownError(error, shutdownOptions.onError))
          .finally(unregister)
      }
      handlers.set(signal, handler)
      process.on(signal, handler)
    }
  }

  return server
}
