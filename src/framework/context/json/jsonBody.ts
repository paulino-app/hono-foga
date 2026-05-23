import type { Context } from '../../types'
/**
 * Obtiene el cuerpo de la solicitud como JSON.
 *
 * @returns `object` si existe y es JSON, o `null` si no está presente.
 */
async function jsonBody(context: Context) {
  const body = await context.req.json()

  if (!body) {
    return {}
  }

  return body
}

export default jsonBody
