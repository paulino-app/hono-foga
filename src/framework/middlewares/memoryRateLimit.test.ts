import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { Hono } from 'hono'
import { createMemoryRateLimitFactory } from './memoryRateLimit.js'

afterEach(() => {
  mock.restore()
})

describe('createMemoryRateLimitFactory', () => {
  test('limits identities independently and resets expired windows', async () => {
    let now = 1_000
    spyOn(Date, 'now').mockImplementation(() => now)
    const app = new Hono()
    const createRateLimit = createMemoryRateLimitFactory({
      identifyClient: (context) => context.req.header('x-client') ?? 'unknown'
    })

    app.use(
      '/orders',
      createRateLimit({
        keyPrefix: 'orders',
        max: 2,
        windowSeconds: 60
      })
    )
    app.post('/orders', (context) => context.json({ ok: true }))

    const request = (client: string) =>
      app.request('/orders', {
        method: 'POST',
        headers: { 'x-client': client }
      })

    expect((await request('one')).status).toBe(200)
    expect((await request('one')).status).toBe(200)

    const limited = await request('one')
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBe('60')
    expect((await request('two')).status).toBe(200)

    now += 60_000
    expect((await request('one')).status).toBe(200)
  })

  test('uses route identities and bounds bucket memory', async () => {
    let now = 1_000
    spyOn(Date, 'now').mockImplementation(() => now)
    const app = new Hono()
    const createRateLimit = createMemoryRateLimitFactory({
      identifyClient: () => 'client',
      maxBuckets: 1
    })

    app.use(
      '/login',
      createRateLimit({
        keyPrefix: 'login',
        max: 1,
        windowSeconds: 10,
        identify: (context) => context.req.header('x-account') ?? null
      })
    )
    app.post('/login', (context) => context.text('ok'))

    const request = (account: string) =>
      app.request('/login', {
        method: 'POST',
        headers: { 'x-account': account }
      })

    expect((await request('one')).status).toBe(200)
    expect((await request('two')).status).toBe(429)

    now += 10_000
    expect((await request('two')).status).toBe(200)
  })

  test('rejects invalid configuration', () => {
    expect(() =>
      createMemoryRateLimitFactory({
        identifyClient: () => 'client',
        maxBuckets: 0
      })
    ).toThrow('maxBuckets must be a positive integer')

    const createRateLimit = createMemoryRateLimitFactory({
      identifyClient: () => 'client'
    })
    expect(() =>
      createRateLimit({ keyPrefix: 'test', max: 0, windowSeconds: 60 })
    ).toThrow('max must be a positive integer')
  })
})
