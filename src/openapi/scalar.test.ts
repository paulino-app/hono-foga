import { describe, expect, test } from 'bun:test'
import type { OpenAPIObject } from 'openapi3-ts/oas30'
import { normalizeOpenAPIPaths } from './scalar.js'

function document(paths: OpenAPIObject['paths']): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths
  }
}

describe('normalizeOpenAPIPaths', () => {
  test('normalizes only Hono parameter segments', () => {
    const normalized = normalizeOpenAPIPaths(
      document({
        '/users/:id/orders/:order_id': {},
        '/articles/:slug{[a-z]+}': {},
        '/files/:name.json': {},
        '/reports/12:30': {}
      })
    )

    expect(normalized.paths).toHaveProperty('/users/{id}/orders/{order_id}')
    expect(normalized.paths).toHaveProperty('/articles/{slug}')
    expect(normalized.paths?.['/files/{name}.json']).toBeDefined()
    expect(normalized.paths).toHaveProperty('/reports/12:30')
  })

  test('rejects optional parameters that OpenAPI cannot represent', () => {
    expect(() =>
      normalizeOpenAPIPaths(document({ '/users/:id?': {} }))
    ).toThrow('Unsupported Hono parameter syntax')
  })

  test('rejects collisions with an existing OpenAPI path', () => {
    expect(() =>
      normalizeOpenAPIPaths(
        document({
          '/users/:id': {},
          '/users/{id}': {}
        })
      )
    ).toThrow('OpenAPI path collision')
  })
})
