import { randomBytes } from 'crypto'

export default function generateApiKey(length = 32) {
  return randomBytes(length).toString('hex').slice(0, length)
}
