import { OpenAPIHono, type Hook } from '@hono/zod-openapi'
import defaultHook from '../openapi/default-hook.js'
import type { AppBindings } from './types.js'

export interface CreateRouterOptions {
  strict?: boolean
  defaultHook?: Hook<any, any, any, any> | false
}

export default function createRouter<
  Bindings extends AppBindings = AppBindings
>(options: CreateRouterOptions = {}) {
  const { strict = false, defaultHook: validationHook = defaultHook } = options

  if (validationHook === false) {
    return new OpenAPIHono<Bindings>({ strict })
  }

  return new OpenAPIHono<Bindings>({
    strict,
    defaultHook: validationHook
  })
}
