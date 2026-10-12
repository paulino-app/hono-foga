import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import createApp from './createApp.js'

describe('createApp', () => {
  test('assembles an app without a modules directory', async () => {
    const app = await createApp({
      modulesDir: join(import.meta.dir, 'missing-modules'),
      root: { ok: true }
    })

    expect((await app.request('/')).status).toBe(200)
  })

  test('can disable module discovery', async () => {
    const app = await createApp({ modulesDir: false, root: { ok: true } })
    expect(await (await app.request('/')).json()).toEqual({ ok: true })
  })

  test('applies a conservative global body limit', async () => {
    const app = await createApp({
      modulesDir: false,
      configure: (router) => {
        router.post('/body', async (context) =>
          context.json({ body: await context.req.text() })
        )
      }
    })
    const response = await app.request('/body', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'x'.repeat(1_048_577)
    })

    expect(response.status).toBe(413)
  })

  test('runs bootstrap after route registration succeeds', async () => {
    const events: string[] = []
    await createApp({
      modulesDir: false,
      configure: () => {
        events.push('configure')
      },
      bootstrap: () => {
        events.push('bootstrap')
      }
    })

    expect(events).toEqual(['configure', 'bootstrap'])
  })
})
