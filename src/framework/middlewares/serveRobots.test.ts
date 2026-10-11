import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import serveRobots from './serveRobots.js'

describe('serveRobots', () => {
  test('serves custom content and path', async () => {
    const app = new Hono()
    app.use(
      serveRobots({
        path: '/crawler.txt',
        content: 'User-agent: *\nAllow: /'
      })
    )

    const response = await app.request('/crawler.txt')

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=UTF-8'
    )
    expect(await response.text()).toBe('User-agent: *\nAllow: /')
  })
})
