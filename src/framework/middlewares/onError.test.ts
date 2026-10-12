import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createOnError } from './onError.js'

describe('createOnError', () => {
  test('hides internal errors by default', async () => {
    const app = new Hono()
    app.get('/', () => {
      throw new Error('database password leaked')
    })
    app.onError(createOnError())

    const response = await app.request('/')

    expect(await response.json()).toEqual({ message: 'Internal Server Error' })
  })

  test('hides internal error messages in production', async () => {
    const app = new Hono()
    app.get('/', () => {
      throw new Error('database password leaked')
    })
    app.onError(createOnError({ mode: 'production' }))

    const response = await app.request('/')

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      message: 'Internal Server Error'
    })
  })

  test('preserves deliberate client error messages', async () => {
    const app = new Hono()
    app.get('/', () => {
      throw new HTTPException(400, { message: 'Invalid account id' })
    })
    app.onError(createOnError({ mode: 'production' }))

    const response = await app.request('/')

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Invalid account id' })
  })

  test('preserves custom HTTPException responses and headers', async () => {
    const app = new Hono()
    app.get('/', () => {
      throw new HTTPException(401, {
        res: new Response('Custom response', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer' }
        })
      })
    })
    app.onError(createOnError())

    const response = await app.request('/')
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe('Bearer')
    expect(await response.text()).toBe('Custom response')
  })

  test('hides server HTTPException responses by default', async () => {
    const app = new Hono()
    app.get('/', () => {
      throw new HTTPException(500, {
        res: new Response('database password leaked', { status: 418 })
      })
    })
    app.onError(createOnError({ mode: 'production' }))

    const response = await app.request('/')
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ message: 'Internal Server Error' })
  })

  test('can expose an intentional server HTTPException', async () => {
    const app = new Hono()
    app.get('/', () => {
      const error = new HTTPException(503, { message: 'Service unavailable' })
      Object.assign(error, { expose: true })
      throw error
    })
    app.onError(createOnError({ mode: 'production' }))

    const response = await app.request('/')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ message: 'Service unavailable' })
  })

  test('reports errors through the configured callback', async () => {
    const reports: string[] = []
    const app = new Hono()
    app.get('/', () => {
      throw new Error('boom')
    })
    app.onError(
      createOnError({
        mode: 'production',
        report: ({ error }) => {
          reports.push(error.message)
        }
      })
    )

    await app.request('/')

    expect(reports).toEqual(['boom'])
  })

  test('still responds when the reporter fails', async () => {
    const app = new Hono()
    app.get('/', () => {
      throw new Error('boom')
    })
    app.onError(
      createOnError({
        mode: 'production',
        report: () => {
          throw new Error('reporter unavailable')
        }
      })
    )

    const originalConsoleError = console.error
    try {
      console.error = () => {}
      const response = await app.request('/')
      expect(response.status).toBe(500)
    } finally {
      console.error = originalConsoleError
    }
  })
})
