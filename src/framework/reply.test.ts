import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import Reply from './reply.js'

describe('Reply', () => {
  test('created responds with 201', async () => {
    const app = new Hono()
    app.post('/', (context) => Reply.created(context))

    const response = await app.request('/', { method: 'POST' })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ message: 'Created' })
  })

  test('tooManyRequests uses seconds for the default retry delay', async () => {
    const app = new Hono()
    app.get('/', (context) => Reply.tooManyRequests(context))

    const response = await app.request('/')

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('900')
    expect(await response.json()).toEqual({
      message: 'Too Many Requests',
      retryAfter: 900
    })
  })
})
