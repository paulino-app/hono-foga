import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createLogger, type LogEntry } from './logger.js'

describe('createLogger', () => {
  test('supports skipping, enrichment, formatting and custom sinks', async () => {
    const entries: LogEntry[] = []
    const messages: string[] = []
    const app = new Hono()
    app.use(
      createLogger({
        timeZone: 'UTC',
        skip: (context) => context.req.path === '/alive',
        enrich: () => ({ actor: 'paulino' }),
        format: (entry) => `${entry.direction}:${entry.metadata.actor}`,
        sink: (message, entry) => {
          messages.push(message)
          entries.push(entry)
        }
      })
    )
    app.get('*', (context) => context.text('ok'))

    await app.request('/alive')
    await app.request('/accounts?access_token=secret')

    expect(messages).toEqual(['request:paulino', 'response:paulino'])
    expect(entries[1]?.status).toBe(200)
    expect(entries[1]?.durationMs).toBeNumber()
    expect(entries[0]?.url).toBe('/accounts')
  })
})
