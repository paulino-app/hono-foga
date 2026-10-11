import {
  base64url,
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

export function getAuthSecret(secret: string): AuthSecret {
  if (!secret) {
    throw new Error('JWT secret must not be empty')
  }

  return {
    kty: 'oct',
    k: base64url.encode(new TextEncoder().encode(secret))
  }
}

export const getAuthSecretByToken = getAuthSecret

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

export interface CreateJwtOptions {
  secret: string
}

export function createJwt(options: CreateJwtOptions) {
  const key = getAuthSecret(options.secret)

  return {
    sign: (payload: JWTPayload) => createToken(payload, key),
    verify: (token: string) => verify(token, key),
    decode: decodeToken
  }
}
