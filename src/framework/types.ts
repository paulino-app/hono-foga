import { OpenAPIHono } from '@hono/zod-openapi'
import type { Context as HonoContext } from 'hono'

export interface AppBindings {
  Variables: {}
}

/**
 * Project wide context type. Wider than the default Context from hono because
 * handlers in framework users are typically static methods registered through
 * router.openapi(...), which means TS can not infer the validators from the
 * method signature alone.
 */
export type Context<Bindings extends AppBindings = AppBindings> = HonoContext<
  Bindings,
  string,
  {
    in: any
    out: {
      json: any
      form: any
      query: any
      param: any
      header: any
      cookie: any
    }
  }
>

export type AppOpenAPI<Bindings extends AppBindings = AppBindings> =
  OpenAPIHono<Bindings>

// Backwards compatible alias for consumers that still spell it with the typo.
export type AppBindigs = AppBindings
