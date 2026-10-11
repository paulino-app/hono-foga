import { describe, expect, test } from 'bun:test'
import { emptySchema, idNumberParam, replyMessageSchema } from './schemas.js'

describe('OpenAPI helper schemas', () => {
  test('validates an empty object', () => {
    expect(emptySchema.parse({})).toEqual({})
  })

  test('validates reply messages', () => {
    expect(replyMessageSchema.parse({ message: 'Created' })).toEqual({
      message: 'Created'
    })
  })

  test('coerces named numeric parameters', () => {
    expect(idNumberParam('accountId').parse({ accountId: '42' })).toEqual({
      accountId: 42
    })
  })
})
