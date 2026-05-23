type PasswordHashAlgorithm = 'argon2id' | 'bcrypt'

/**
 * Returns a hash of a dummy password. Used to keep "user not found" and "wrong
 * password" branches at roughly the same wall-time cost. Caller passes the
 * algorithm so the package does not read env.
 */
export async function getDummyPasswordHash(
  algorithm: PasswordHashAlgorithm = 'argon2id'
): Promise<string> {
  return await Bun.password.hash('dummy-password', { algorithm })
}

export default getDummyPasswordHash
