import type { ZodSchema } from './types.js'

import oneOf from './one-of.js'

const jsonContentOneOf = <T extends ZodSchema>(
  schemas: T[],
  description: string
) => {
  return {
    content: {
      'application/json': {
        schema: {
          oneOf: oneOf(schemas)
        }
      }
    },
    description
  }
}

export default jsonContentOneOf
