import { describe, expect, test } from 'bun:test'
import { createJwt, getAuthSecret } from './jwt.js'

describe('JWT helpers', () => {
  test('rejects empty secrets', () => {
    expect(() => getAuthSecret('')).toThrow('JWT secret must not be empty')
  })

  test('creates base64url JWK secrets', () => {
    const key = getAuthSecret('a secret that includes symbols +/=')

    expect(key.k).not.toMatch(/[+/=]/)
  })

  test('signs and verifies with an explicit secret', async () => {
    const jwt = createJwt({ secret: 'correct-secret' })
    const token = await jwt.sign({ id: 42 })

    expect(await jwt.verify(token)).toBe(true)
    expect(await createJwt({ secret: 'wrong-secret' }).verify(token)).toBe(
      false
    )
    expect(jwt.decode(token)?.id).toBe(42)
  })
})
