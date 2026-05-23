import { OpenAPIHono } from '@hono/zod-openapi'
import defaultHook from '../openapi/default-hook.js'
import type { AppBindings } from './types.js'

export default function createRouter<
  Bindings extends AppBindings = AppBindings
>() {
  return new OpenAPIHono<Bindings>({
    strict: false,
    defaultHook
  })
}
