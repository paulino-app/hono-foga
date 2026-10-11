import type { Context } from '../../types.js'

/**
 * Returns the request's already-validated JSON body. Typed as `any` because
 * each call site knows its own schema (the @hono/zod-openapi route config),
 * but we can't carry that through static method signatures.
 */
function validJsonBody(context: Context): any {
  const body = context.req.valid('json')
  if (!body) {
    return null
  }
  return body
}

export default validJsonBody
