import path from 'path'

/**
 * Genera una ruta absoluta basada en el directorio del proyecto.
 *
 * Esta función toma una lista de segmentos de ruta (`args`) y construye
 * una ruta absoluta partiendo del directorio actual del proyecto
 * y luego añadiendo los segmentos especificados.
 *
 * @param {...string} args - Segmentos de la ruta a concatenar.
 * @returns {string} Ruta absoluta construida.
 */
export function getPath(...args: string[]): string {
  const projectDirectory = process.cwd()
  return path.join(projectDirectory, ...args)
}
