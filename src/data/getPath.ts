import path from 'node:path'

export type PathResolver = (...segments: string[]) => string

export function createPathResolver(baseDirectory: string): PathResolver {
  if (!baseDirectory) {
    throw new Error('Path resolver base directory must not be empty')
  }

  return (...segments: string[]) => path.join(baseDirectory, ...segments)
}

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
  return createPathResolver(process.cwd())(...args)
}
