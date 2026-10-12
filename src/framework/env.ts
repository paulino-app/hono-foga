import type { z } from 'zod'

export interface DefineEnvOptions<TSchema extends z.ZodTypeAny> {
  schema: TSchema
  values?: unknown
}

export class EnvironmentValidationError extends Error {
  constructor(readonly validationError: z.ZodError) {
    const details = validationError.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'environment'
      return `- ${path}: ${issue.message}`
    })

    super(`Invalid environment configuration:\n${details.join('\n')}`)
    this.name = 'EnvironmentValidationError'
  }
}

export function defineEnv<TSchema extends z.ZodTypeAny>({
  schema,
  values = process.env
}: DefineEnvOptions<TSchema>): z.output<TSchema> {
  const result = schema.safeParse(values)

  if (!result.success) {
    throw new EnvironmentValidationError(result.error)
  }

  return result.data
}
