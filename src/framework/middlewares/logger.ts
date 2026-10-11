import chalk from 'chalk'
import type { Context, MiddlewareHandler } from 'hono'

const httpAbbreviation: Record<string, string> = {
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

const methodDirection = {
  response: chalk.bgWhite.black(' RES '),
  request: chalk.bgBlack.white(' REQ ')
} as const

export function createGetCurrentTime(timeZone: string): () => string {
  return () => {
    const now = new Date()
    const local = new Date(now.toLocaleString('en-US', { timeZone }))

    let hours = local.getHours()
    const minutes = local.getMinutes()
    const seconds = local.getSeconds()
    const ampm = hours >= 12 ? 'PM' : 'AM'

    hours = hours % 12
    hours = hours || 12
    const strHours = hours < 10 ? `0${hours}` : hours.toString()
    const strMinutes = minutes < 10 ? `0${minutes}` : minutes.toString()
    const strSeconds = seconds < 10 ? `0${seconds}` : seconds.toString()

    return `${strHours}:${strMinutes}:${strSeconds} ${ampm}`
  }
}

export interface LogEntry {
  context: Context
  direction: 'request' | 'response'
  timestamp: string
  method: string
  url: string
  status?: number
  durationMs?: number
  metadata: Record<string, unknown>
}

export type LoggerSink = (
  message: string,
  entry: LogEntry
) => void | Promise<void>

export interface LoggerOptions {
  timeZone: string
  skip?: (context: Context) => boolean | Promise<boolean>
  enrich?: (
    context: Context,
    direction: LogEntry['direction']
  ) => Record<string, unknown> | Promise<Record<string, unknown>>
  format?: (entry: LogEntry) => string
  sink?: LoggerSink
}

function formatDuration(durationMs: number): string {
  return durationMs < 1000
    ? `${durationMs}ms`
    : `${Math.round(durationMs / 1000)}s`
}

export function formatLogEntry(entry: LogEntry): string {
  const methodLabel = ` ${httpAbbreviation[entry.method] ?? entry.method} `
  const method = getMethodColor(methodLabel)
  const direction = methodDirection[entry.direction]
  const timestamp = chalk.gray(entry.timestamp)
  const status = entry.status ? getStatusColor(entry.status) : ''
  const duration =
    entry.durationMs === undefined
      ? ''
      : chalk.gray(formatDuration(entry.durationMs))
  const metadata = Object.values(entry.metadata)
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String)
    .join(' ')
  const suffix = [status, duration, metadata].filter(Boolean).join(' ')

  return `${timestamp} ${direction} ${method} ${entry.url}${suffix ? ` ${suffix}` : ''}`
}

function getRequestUrl(context: Context): string {
  if (!context.req.url.includes('://')) {
    return context.req.url
  }

  const url = new URL(context.req.url)
  return url.pathname
}

export function createLogger(options: LoggerOptions): MiddlewareHandler {
  const getCurrentTime = createGetCurrentTime(options.timeZone)
  const format = options.format ?? formatLogEntry
  const sink = options.sink ?? ((message: string) => console.log(message))

  return async (context, next) => {
    if (await options.skip?.(context)) {
      return next()
    }

    const createEntry = async (
      direction: LogEntry['direction'],
      details: Pick<LogEntry, 'status' | 'durationMs'> = {}
    ): Promise<LogEntry> => ({
      context,
      direction,
      timestamp: getCurrentTime(),
      method: context.req.method,
      url: getRequestUrl(context),
      metadata: (await options.enrich?.(context, direction)) ?? {},
      ...details
    })

    const requestEntry = await createEntry('request')
    await sink(format(requestEntry), requestEntry)

    const startedAt = Date.now()
    await next()

    const responseEntry = await createEntry('response', {
      status: context.res.status,
      durationMs: Date.now() - startedAt
    })
    await sink(format(responseEntry), responseEntry)
  }
}
