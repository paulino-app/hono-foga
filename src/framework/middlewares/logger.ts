/**
 * HTTP request logger with colored console output. The factory takes the
 * timezone so the package stays free of environment lookups.
 */
import chalk from 'chalk'
import type { MiddlewareHandler } from 'hono'

const httpAbreviation: Record<string, string> = {
  GET: 'GET',
  POST: 'PST',
  DELETE: 'DEL',
  PUT: 'PUT'
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) {
    return chalk.green(status.toString())
  }
  if (status >= 500 && status < 600) {
    return chalk.red(status.toString())
  }
  if (status >= 400 && status < 500) {
    return chalk.yellow(status.toString())
  }
  if (status >= 300 && status < 400) {
    return chalk.blue(status.toString())
  }
  return status.toString()
}

function getMethodColor(label: string) {
  const method = label.trim()
  if (method === 'GET') {
    return chalk.white.bgGreen(label)
  }
  if (method === 'PST') {
    return chalk.white.bgYellow(label)
  }
  if (method === 'PUT') {
    return chalk.white.bgBlue(label)
  }
  if (method === 'DEL') {
    return chalk.white.bgRed(label)
  }
  return chalk.gray(label)
}

const methodDirection: Record<string, string> = {
  response: chalk.bgWhite.black(' RES '),
  request: chalk.bgBlack.white(' REQ ')
}

export function createGetCurrentTime(timeZone: string): () => string {
  return () => {
    const now = new Date()
    const local = new Date(now.toLocaleString('en-US', { timeZone }))

    let hours = local.getHours()
    const minutes = local.getMinutes()
    const seconds = local.getSeconds()
    const ampm = hours >= 12 ? 'PM' : 'AM'

    hours = hours % 12
    hours = hours ? hours : 12
    const strHours = hours < 10 ? '0' + hours : hours.toString()
    const strMinutes = minutes < 10 ? '0' + minutes : minutes.toString()
    const strSeconds = seconds < 10 ? '0' + seconds : seconds.toString()

    return `${strHours}:${strMinutes}:${strSeconds} ${ampm}`
  }
}

export interface LoggerOptions {
  timeZone: string
}

export function createLogger(options: LoggerOptions): MiddlewareHandler {
  const getCurrentTime = createGetCurrentTime(options.timeZone)

  function customLogger(ctx: any, message: string) {
    const [direction, time, status] = message.split(' ')
    const method: string = ctx.req.method
    const url: string = ctx.req.url.includes('://')
      ? new URL(ctx.req.url).pathname +
        new URL(ctx.req.url).search +
        new URL(ctx.req.url).hash
      : ctx.req.url

    const methodFormated = ` ${httpAbreviation[method] ?? method} `
    const methodColor = getMethodColor(methodFormated)
    const statusColor = status ? getStatusColor(parseInt(status, 10)) : ''

    const _direction = methodDirection[direction]
    const _time = chalk.gray(getCurrentTime())
    const finalTime = chalk.gray(time ?? '')
    const meta = time ? `${statusColor} ${finalTime}` : ''
    const log = `${_time} ${_direction} ${methodColor} ${url} ${meta}`

    console.log(log)
  }

  return async (ctx, next) => {
    const start = Date.now()
    customLogger(ctx, 'request')

    await next()

    const end = Date.now()
    const duration = Math.round(end - start)
    const _duration =
      duration < 1000
        ? `${duration}ms`
        : `${Math.round(duration / 1000)}s`

    customLogger(ctx, `response ${_duration} ${ctx.res.status}`)
  }
}
