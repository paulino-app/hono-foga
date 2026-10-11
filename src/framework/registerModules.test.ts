import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import createRouter from './createRouter.js'
import { registerModules } from './registerModules.js'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('registerModules', () => {
  test('rejects permission routes without a guard', async () => {
    const modulesDir = mkdtempSync(join(tmpdir(), 'hono-foga-modules-'))
    temporaryDirectories.push(modulesDir)
    const moduleDir = join(modulesDir, 'accounts')
    mkdirSync(moduleDir)
    writeFileSync(
      join(moduleDir, 'controllers.js'),
      `export const registeredRoutes = [{
        options: {
          method: 'get',
          path: '/',
          responses: { 200: { description: 'Success' } }
        },
        handler: (context) => context.json({}),
        permission: [{ id: 1 }]
      }]`
    )

    await expect(
      registerModules(createRouter(), {
        modulesDir,
        controllersFileName: 'controllers.js'
      })
    ).rejects.toThrow('createPermissionGuard is not configured')
  })

  test('rejects route policies without their factories', async () => {
    const modulesDir = mkdtempSync(join(tmpdir(), 'hono-foga-modules-'))
    temporaryDirectories.push(modulesDir)
    const moduleDir = join(modulesDir, 'auth')
    mkdirSync(moduleDir)
    writeFileSync(
      join(moduleDir, 'controllers.js'),
      `export const registeredRoutes = [{
        options: {
          method: 'post',
          path: '/login',
          responses: { 200: { description: 'Success' } }
        },
        handler: (context) => context.json({ ok: true }),
        bodyLimit: { maxSize: 1024 }
      }]`
    )

    await expect(
      registerModules(createRouter(), {
        modulesDir,
        controllersFileName: 'controllers.js'
      })
    ).rejects.toThrow('createBodyLimit is not configured')
  })

  test('rejects rate limits without a factory', async () => {
    const modulesDir = mkdtempSync(join(tmpdir(), 'hono-foga-modules-'))
    temporaryDirectories.push(modulesDir)
    const moduleDir = join(modulesDir, 'auth')
    mkdirSync(moduleDir)
    writeFileSync(
      join(moduleDir, 'controllers.js'),
      `export const registeredRoutes = [{
        options: {
          method: 'post',
          path: '/login',
          responses: { 200: { description: 'Success' } }
        },
        handler: (context) => context.json({ ok: true }),
        rateLimit: [{ keyPrefix: 'login', max: 5, windowSeconds: 60 }]
      }]`
    )

    await expect(
      registerModules(createRouter(), {
        modulesDir,
        controllersFileName: 'controllers.js'
      })
    ).rejects.toThrow('createRateLimit is not configured')
  })

  test('applies declarative policies in route order', async () => {
    const modulesDir = mkdtempSync(join(tmpdir(), 'hono-foga-modules-'))
    temporaryDirectories.push(modulesDir)
    const moduleDir = join(modulesDir, 'auth')
    mkdirSync(moduleDir)
    writeFileSync(
      join(moduleDir, 'controllers.js'),
      `export const registeredRoutes = [{
        options: {
          method: 'post',
          path: '/login',
          responses: { 200: { description: 'Success' } }
        },
        handler: (context) => context.json({ ok: true }),
        bodyLimit: { maxSize: 1024 },
        rateLimit: [
          { keyPrefix: 'ip', max: 10, windowSeconds: 60 },
          { keyPrefix: 'account', max: 5, windowSeconds: 60 }
        ]
      }]`
    )
    const events: string[] = []
    const app = createRouter()

    await registerModules(app, {
      modulesDir,
      controllersFileName: 'controllers.js',
      createBodyLimit: (config) => async (_context, next) => {
        events.push(`body:${config.maxSize}`)
        await next()
      },
      createRateLimit: (config) => async (_context, next) => {
        events.push(`rate:${config.keyPrefix}`)
        await next()
      }
    })

    const response = await app.request('/auth/login', { method: 'POST' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(events).toEqual(['body:1024', 'rate:ip', 'rate:account'])

    events.length = 0
    expect((await app.request('/auth/login')).status).toBe(404)
    expect(events).toEqual([])
  })
})
