import { describe, expect, test } from 'bun:test'
import { createRoute, z } from '@hono/zod-openapi'
import createRouter from './createRouter.js'

const route = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: z.object({ id: z.coerce.number() })
  },
  responses: {
    200: {
      description: 'Success'
    }
  }
})

describe('createRouter', () => {
  test('uses the package validation hook by default', async () => {
    const app = createRouter()
    app.openapi(route, (context) => context.json({}, 200))

    const response = await app.request('/?id=invalid')

    expect(response.status).toBe(422)
  })

  test('allows the package validation hook to be disabled', async () => {
    const app = createRouter({ defaultHook: false })
    app.openapi(route, (context) => context.json({}, 200))

    const response = await app.request('/?id=invalid')

    expect(response.status).toBe(400)
  })
})
