/*
  obtiene la fecha actual en formato DD/MM/YYYY
*/
export function getCurrentDay(): string {
  const now = new Date()
  const day = now.getDate()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

/*
  obtiene la hora actual en formato HH:MM
*/
export function getCurrentHour(): string {
  const now = new Date()
  const hour = now.getHours()
  const minutes = now.getMinutes()
  return `${hour}:${minutes}`
}
