import { describe, expect, test } from 'bun:test'
import { createJwt, getAuthSecret } from './jwt.js'

describe('JWT helpers', () => {
  test('rejects empty secrets', () => {
    expect(() => getAuthSecret('')).toThrow('at least 32 bytes')
    expect(() => getAuthSecret('too-short')).toThrow('at least 32 bytes')
  })

  test('creates base64url JWK secrets', () => {
    const key = getAuthSecret('a secret that includes symbols +/= and length')

    expect(key.k).not.toMatch(/[+/=]/)
  })

  test('signs and verifies with an explicit secret', async () => {
    const options = {
      secret: 'correct-secret-that-is-at-least-32-bytes',
      issuer: 'test-issuer',
      audience: 'test-audience',
      expiresInSeconds: 60
    }
    const jwt = createJwt(options)
    const token = await jwt.sign({ id: 42 })

    expect(await jwt.verify(token)).toBe(true)
    expect(
      await createJwt({
        ...options,
        secret: 'wrong-secret-that-is-at-least-32-bytes'
      }).verify(token)
    ).toBe(false)
    expect(jwt.decode(token)?.id).toBe(42)
    expect(jwt.decode(token)?.exp).toBeNumber()
  })
})
