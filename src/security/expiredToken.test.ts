import { describe, expect, test } from 'bun:test'
import { isTokenExpired } from './expiredToken.js'

describe('isTokenExpired', () => {
  test('rejects malformed and boundary expirations', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(isTokenExpired('invalid')).toBe(true)
    expect(isTokenExpired(now)).toBe(true)
    expect(isTokenExpired(now + 60)).toBe(false)
  })
})
