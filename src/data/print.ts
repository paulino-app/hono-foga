import chalk from 'chalk'
import { createGetCurrentTime } from '../framework/middlewares/logger.js'

/**
 * Creates a console.log wrapper that prefixes every message with the current
 * time in the given timezone. Each consumer wires it once with its own zone.
 */
export function createPrint(timeZone: string): (...messages: any[]) => void {
  const getCurrentTime = createGetCurrentTime(timeZone)

  return (...messages: any[]) => {
    const time = chalk.gray(getCurrentTime())
    console.log(time, ...messages)
  }
}
