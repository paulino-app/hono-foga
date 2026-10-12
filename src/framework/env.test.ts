import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { defineEnv, EnvironmentValidationError } from './env.js'

describe('defineEnv', () => {
  test('validates, transforms and types environment values', () => {
    const env = defineEnv({
      schema: z.object({
        PORT: z.coerce.number().int().positive(),
        ENABLED: z
          .enum(['true', 'false'])
          .transform((value) => value === 'true'),
        NAME: z.string().default('app')
      }),
      values: { PORT: '9000', ENABLED: 'true' }
    })

    expect(env).toEqual({ PORT: 9000, ENABLED: true, NAME: 'app' })
  })

  test('throws a readable validation error', () => {
    expect(() =>
      defineEnv({
        schema: z.object({ PORT: z.coerce.number().int().positive() }),
        values: { PORT: 'invalid' }
      })
    ).toThrow(EnvironmentValidationError)

    expect(() =>
      defineEnv({
        schema: z.object({ PORT: z.coerce.number().int().positive() }),
        values: { PORT: 'invalid' }
      })
    ).toThrow('Invalid environment configuration:\n- PORT:')
  })
})
