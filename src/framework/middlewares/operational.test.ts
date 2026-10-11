import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createAbout } from './about.js'
import { createAlive } from './alive.js'
import { createHealth } from './health.js'

describe('operational middlewares', () => {
  test('serves configurable liveness and about responses', async () => {
    const app = new Hono()
    app.use(createAlive({ body: { alive: true } }))
    app.use(createAbout({ info: { name: 'Example API' } }))

    const aliveResponse = await app.request('/alive')
    const aboutResponse = await app.request('/')

    expect(await aliveResponse.json()).toEqual({ alive: true })
    expect(await aboutResponse.json()).toEqual({ name: 'Example API' })
  })

  test('runs health checks and keeps a stable startup timestamp', async () => {
    const app = new Hono()
    app.use(
      createHealth({
        version: '1.2.3',
        checks: {
          database: () => ({ connected: true })
        }
      })
    )

    const first = await (await app.request('/health')).json()
    const second = await (await app.request('/health')).json()

    expect(first.status).toBe('ok')
    expect(first.version).toBe('1.2.3')
    expect(first.dependencies.database.status).toBe('ok')
    expect(first.uptime.startedAt).toBe(second.uptime.startedAt)
  })

  test('returns 503 and hides dependency errors by default', async () => {
    const app = new Hono()
    app.use(
      createHealth({
        checks: {
          database: () => {
            throw new Error('database password leaked')
          }
        }
      })
    )

    const response = await app.request('/health')
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.dependencies.database.error).toBe('Dependency unavailable')
  })

  test('times out slow dependencies', async () => {
    const app = new Hono()
    app.use(
      createHealth({
        timeoutMs: 1,
        exposeErrors: true,
        checks: {
          queue: () => new Promise((resolve) => setTimeout(resolve, 20))
        }
      })
    )

    const response = await app.request('/health')
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.dependencies.queue.error).toBe(
      'Health check timed out after 1ms'
    )
  })
})
