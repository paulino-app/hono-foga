import { z } from '@hono/zod-openapi'
import jsonContent from './json-content.js'

export default function jsonMessage(message: string) {
  return jsonContent(z.object({ message: z.string() }), message)
}
