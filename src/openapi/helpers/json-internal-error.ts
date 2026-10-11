import { z } from '@hono/zod-openapi'
import jsonContent from './json-content.js'

export const ErrorResponse = jsonContent(
  z.object({ message: z.string() }),
  'Error interno del servidor'
)
