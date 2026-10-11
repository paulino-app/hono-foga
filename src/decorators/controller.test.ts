import { describe, expect, test } from 'bun:test'
import { z } from '@hono/zod-openapi'
import { createRouteRegistry } from './controller.js'

describe('createRouteRegistry', () => {
  test('stores auth and documents Bearer security by default', () => {
    const { Route, registeredRoutes } = createRouteRegistry()
    const controller = {
      handler() {
        return new Response()
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(controller, 'handler')!

    Route({
      method: 'get',
      path: '/me',
      auth: true,
      responses: { 200: { description: 'Success' } }
    })(controller, 'handler', descriptor)

    expect(registeredRoutes[0]?.auth).toBe(true)
    expect(registeredRoutes[0]?.options).not.toHaveProperty('auth')
    expect(registeredRoutes[0]?.options.security).toEqual([{ bearerAuth: [] }])
  })

  test('preserves an explicit OpenAPI security scheme', () => {
    const { Route, registeredRoutes } = createRouteRegistry()
    const controller = {
      handler() {
        return new Response()
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(controller, 'handler')!

    Route({
      method: 'get',
      path: '/internal',
      auth: true,
      security: [{ apiKey: [] }],
      responses: { 200: { description: 'Success' } }
    })(controller, 'handler', descriptor)

    expect(registeredRoutes[0]?.options.security).toEqual([{ apiKey: [] }])
  })

  test('adds policy responses while preserving explicit responses', () => {
    const { Route, registeredRoutes } = createRouteRegistry()
    const controller = {
      handler() {
        return new Response()
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(controller, 'handler')!

    Route({
      method: 'post',
      path: '/orders',
      auth: true,
      permission: [{ key: 'orders.create' }],
      bodyLimit: { maxSize: 1024 },
      rateLimit: { keyPrefix: 'orders', max: 5, windowSeconds: 60 },
      request: {
        body: { content: { 'application/json': { schema: z.object({}) } } }
      },
      responses: {
        201: { description: 'Created' },
        403: { description: 'Custom forbidden response' }
      }
    })(controller, 'handler', descriptor)

    expect(Object.keys(registeredRoutes[0]?.options.responses ?? {})).toEqual([
      '201',
      '401',
      '403',
      '413',
      '422',
      '429',
      '500'
    ])
    expect(registeredRoutes[0]?.options.responses[403]?.description).toBe(
      'Custom forbidden response'
    )
  })
})
