import type { Context } from 'hono'

export default function getIPAddress(context: Context): string | undefined {
  const forwarded = context.req.raw.headers.get('x-forwarded-for')
  const userIP = forwarded ? forwarded.split(',')[0] : undefined

  return userIP
}
