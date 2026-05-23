import { UNPROCESSABLE_ENTITY } from '../data/httpStatusCodes'
import type { Hook } from '@hono/zod-openapi'

const defaultHook: Hook<any, any, any, any> = (result: any, c) => {
  if (!result.success) {
    return c.json(
      {
        success: result.success,
        error: result.error
      },
      UNPROCESSABLE_ENTITY
    )
  }
}

export default defaultHook
