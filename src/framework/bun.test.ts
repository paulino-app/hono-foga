import { describe, expect, test } from 'bun:test'
import { createGracefulShutdown } from './bun.js'

describe('createGracefulShutdown', () => {
  test('stops gracefully, cleans up, and ignores repeated signals', async () => {
    const stopCalls: boolean[] = []
    const signals: string[] = []
    let cleanupCalls = 0
    const shutdown = createGracefulShutdown(
      {
        stop: async (force = false) => {
          stopCalls.push(force)
        }
      },
      {
        cleanup: () => {
          cleanupCalls += 1
        },
        onSignal: (signal) => {
          signals.push(signal)
        }
      }
    )

    const first = shutdown('SIGTERM')
    const second = shutdown('SIGINT')
    await Promise.all([first, second])

    expect(first).toBe(second)
    expect(stopCalls).toEqual([false])
    expect(signals).toEqual(['SIGTERM'])
    expect(cleanupCalls).toBe(1)
  })

  test('forces shutdown after the timeout', async () => {
    const stopCalls: boolean[] = []
    const shutdown = createGracefulShutdown(
      {
        stop: (force = false) => {
          stopCalls.push(force)
          return force ? Promise.resolve() : new Promise(() => {})
        }
      },
      { timeoutMs: 5 }
    )

    await shutdown('SIGTERM')
    expect(stopCalls).toEqual([false, true])
  })

  test('runs cleanup when graceful shutdown fails', async () => {
    let cleanedUp = false
    const stopCalls: boolean[] = []
    const shutdown = createGracefulShutdown(
      {
        stop: (force = false) => {
          stopCalls.push(force)
          return force
            ? Promise.resolve()
            : Promise.reject(new Error('stop failed'))
        }
      },
      {
        cleanup: () => {
          cleanedUp = true
        }
      }
    )

    await expect(shutdown('SIGTERM')).rejects.toThrow('stop failed')
    expect(cleanedUp).toBe(true)
    expect(stopCalls).toEqual([false, true])
  })

  test('preserves stop and cleanup failures', async () => {
    const shutdown = createGracefulShutdown(
      {
        stop: (force = false) =>
          Promise.reject(new Error(force ? 'force failed' : 'stop failed'))
      },
      {
        cleanup: () => {
          throw new Error('cleanup failed')
        }
      }
    )

    try {
      await shutdown('SIGTERM')
      throw new Error('Expected shutdown to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError)
      const failures = (error as AggregateError).errors
      expect(failures).toHaveLength(2)
      expect(failures[0]).toBeInstanceOf(AggregateError)
    }
  })

  test('continues shutdown when the signal observer fails', async () => {
    let stopped = false
    const errors: unknown[] = []
    const shutdown = createGracefulShutdown(
      {
        stop: async () => {
          stopped = true
        }
      },
      {
        onSignal: () => {
          throw new Error('observer failed')
        },
        onError: (error) => {
          errors.push(error)
        }
      }
    )

    await shutdown('SIGTERM')
    expect(stopped).toBe(true)
    expect(errors).toHaveLength(1)
  })

  test('rejects invalid timeout values', () => {
    expect(() =>
      createGracefulShutdown({ stop: async () => {} }, { timeoutMs: 0 })
    ).toThrow('shutdown timeoutMs must be a positive integer')
  })
})
