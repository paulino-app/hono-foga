import { env } from 'bun'
import {
  jwtVerify,
  importJWK,
  decodeJwt,
  SignJWT,
  type JWTPayload,
  type JWK
} from 'jose'

export async function createToken(
  payload: JWTPayload,
  secret: JWK
): Promise<string> {
  const privateKey = await importJWK(secret, 'HS256')
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(privateKey)
}

export interface AuthSecret {
  kty: string
  k: string
}

export function getAuthSecret(): AuthSecret {
  return {
    kty: 'oct',
    k: Buffer.from(env.ACCESS_TOKEN_SECRET ?? '').toString('base64')
  }
}

export function getAuthSecretByToken(token: string): AuthSecret {
  return {
    kty: 'oct',
    k: Buffer.from(token).toString('base64')
  }
}

export interface DecodedToken {
  id?: number
  email?: string
  exp?: number
  [key: string]: unknown
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = decodeJwt(token)
    return decoded as DecodedToken
  } catch {
    return null
  }
}

export async function verify(token: string, key: JWK) {
  try {
    const secretKey = await importJWK(key, 'HS256')
    await jwtVerify(token, secretKey)
    return true
  } catch {
    return false
  }
}
