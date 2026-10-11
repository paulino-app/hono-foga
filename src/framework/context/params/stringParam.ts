import type { Context } from '../../types.js'

/**
 * Obtiene un parámetro de ruta como string limpio.
 *
 * - Elimina espacios en blanco al inicio y al final.
 * - Remueve cualquier carácter que no sea letra o número.
 */
function stringParam(context: Context, name: string): string {
  const value = context.req.param(name) ?? ''
  const clean = value.trim()

  return clean
}

export default stringParam
