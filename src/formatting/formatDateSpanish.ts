export default function formatDateSpanish(isoString: string | null) {
  if (!isoString) {
    return 'No Asignado'
  }

  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ]

  const date = new Date(isoString)
  const day = date.getUTCDate()
  const month = months[date.getUTCMonth()]
  const year = date.getUTCFullYear()

  return `${day} de ${month} de ${year}`
}
