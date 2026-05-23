/**
 * Limpia el contenido generado por la IA eliminando rastros de llamadas a herramientas (alucinaciones).
 * Elimina patrones como `changeMood { ... }`, `tool_code ...`, bloques ```tool_code```, etc.
 * @param content El texto generado por la IA.
 * @returns El texto limpio.
 */
export function cleanHallucinations(
  content: string | undefined | null
): string {
  if (!content) {
    return ''
  }

  return content
    .replace(/```tool_code[\s\S]*?```/g, '')
    .replace(/(?:changeMood|learn|remember)\s*[({][\s\S]*?[)}]/g, '')
    .replace(/^[\s]*\{[\s\S]*\}[\s]*$/gm, '')
    .replace(/^\s*print\s*\(.*?\)\s*$/gm, '')
    .replace(/^\s*[\w$.]+\s*\(.*?\)\s*;?\s*$/gm, '')
    .replace(/@+/g, '')
    .trim()
}
