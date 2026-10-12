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
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error('JWT secret must contain at least 32 bytes')
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
  issuer: string
  audience: string
  expiresInSeconds: number
}

export function createJwt(options: CreateJwtOptions) {
  const key = getAuthSecret(options.secret)

  if (!options.issuer || !options.audience) {
    throw new TypeError('JWT issuer and audience must not be empty')
  }
  if (
    !Number.isInteger(options.expiresInSeconds) ||
    options.expiresInSeconds <= 0
  ) {
    throw new TypeError('JWT expiresInSeconds must be a positive integer')
  }

  return {
    sign: async (payload: JWTPayload) => {
      const privateKey = await importJWK(key, 'HS256')
      return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(options.issuer)
        .setAudience(options.audience)
        .setIssuedAt()
        .setExpirationTime(
          Math.floor(Date.now() / 1000) + options.expiresInSeconds
        )
        .sign(privateKey)
    },
    verify: async (token: string) => {
      try {
        const secretKey = await importJWK(key, 'HS256')
        await jwtVerify(token, secretKey, {
          algorithms: ['HS256'],
          issuer: options.issuer,
          audience: options.audience
        })
        return true
      } catch {
        return false
      }
    },
    decode: decodeToken
  }
}
