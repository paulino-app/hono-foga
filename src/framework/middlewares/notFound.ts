import type { Context } from 'hono'
import { NOT_FOUND } from '../../data/httpStatusCodes.js'
import { NOT_FOUND_MESSAGE } from '../../data/httpStatusMessages.js'

export default function notFound(context: Context) {
  return context.json(
    {
      message: `${NOT_FOUND_MESSAGE} - ${context.req.path}`
    },
    NOT_FOUND
  )
}
