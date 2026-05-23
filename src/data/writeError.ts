export default async function WriteError(
  filePath: string,
  content: any,
  token: any
) {
  const timestamp = new Date().toISOString()

  // Convertir el contenido a string legible
  const data = serializeContent(content)
  const user = serializeContent(token)
  const logEntry = `\n[${timestamp}]\n${data}\n${user}\n`

  let existing = ''
  try {
    existing = await Bun.file(filePath).text()
  } catch {
    // El archivo no existe o no se pudo leer: ignoramos y continuamos
  }

  await Bun.write(filePath, existing + logEntry)
}

export function serializeContent(content: any): string {
  if (content instanceof Error) {
    const { name, message, stack, ...extra } = content
    return JSON.stringify({ name, message, stack, ...extra }, null, 2)
  }

  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content, null, 2)
  }

  return String(content)
}
