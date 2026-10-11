import type { Context } from '../../types.js'

function contextQueryNumber(context: Context, name: string): number | null {
  const value = context.req.query(name)

  if (!value) {
    return null
  }

  const number = parseInt(value, 10)

  if (Number.isNaN(number)) {
    return null
  }

  return number
}

export default contextQueryNumber
