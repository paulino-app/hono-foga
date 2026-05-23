/*
 * Validar si un token aun no esta expirado
 * @param dateExpired Fecha de expiración
 * @returns {boolean} 'true' si expiró
 */
export function isTokenExpired(dateExpired: string) {
  const expirationDate = Number(dateExpired)
  const now = Math.floor(Date.now() / 1000)
  return now > expirationDate
}
