import { describe, expect, test } from 'bun:test'
import { z } from '@hono/zod-openapi'
import jsonContent from './json-content.js'
import jsonContentRequired from './json-content-required.js'
import { ErrorResponse } from './json-internal-error.js'
import jsonMessage from './json-message.js'

describe('OpenAPI response contracts', () => {
  test('does not mark response content as required', () => {
    expect(
      jsonContent(z.object({ id: z.number() }), 'Account')
    ).not.toHaveProperty('required')
  })

  test('marks request content as required when requested', () => {
    expect(
      jsonContentRequired(z.object({ id: z.number() }), 'Account').required
    ).toBe(true)
  })

  test('uses the message field for messages and internal errors', () => {
    const messageSchema =
      jsonMessage('Message').content['application/json'].schema
    const errorSchema = ErrorResponse.content['application/json'].schema

    expect(messageSchema.parse({ message: 'ok' })).toEqual({ message: 'ok' })
    expect(errorSchema.parse({ message: 'error' })).toEqual({
      message: 'error'
    })
  })
})
