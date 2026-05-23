import { z } from '@hono/zod-openapi'
import jsonContent from './json-content'

export default function jsonMessage(message: string) {
  return jsonContent(z.object({ mensaje: z.string() }), message)
}
