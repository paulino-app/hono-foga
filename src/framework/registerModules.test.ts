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
  test('requires and applies a guard for auth routes', async () => {
    const modulesDir = mkdtempSync(join(tmpdir(), 'hono-foga-modules-'))
    temporaryDirectories.push(modulesDir)
    const moduleDir = join(modulesDir, 'account')
    mkdirSync(moduleDir)
    writeFileSync(
      join(moduleDir, 'controllers.js'),
      `export const registeredRoutes = [{
        options: {
          method: 'get',
          path: '/me',
          responses: { 200: { description: 'Success' } }
        },
        handler: (context) => context.json({ ok: true }),
        auth: true
      }]`
    )

    await expect(
      registerModules(createRouter(), {
        modulesDir,
        controllersFileName: 'controllers.js'
      })
    ).rejects.toThrow('authGuard is not configured')

    const app = createRouter()
    await registerModules(app, {
      modulesDir,
      controllersFileName: 'controllers.js',
      authGuard: () => async (context, next) => {
        if (context.req.header('authorization') !== 'Bearer valid') {
          return context.json({ message: 'Unauthorized' }, 401)
        }
        await next()
      }
    })

    expect((await app.request('/account/me')).status).toBe(401)
    expect(
      (
        await app.request('/account/me', {
          headers: { authorization: 'Bearer valid' }
        })
      ).status
    ).toBe(200)
  })

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
    ).rejects.toThrow('permissionGuard is not configured')
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
        ],
        permission: [{ key: 'account.read' }],
        permissionMode: 'all',
        getPermissionScope: () => ({ organizationId: 7 })
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
      },
      permissionGuard: (config) => async (context, next) => {
        const scope = await config.getScope?.(context)
        events.push(
          `permission:${config.permissionMode}:${config.permissionArray[0]?.key}:${scope?.organizationId}`
        )
        await next()
      }
    })

    const response = await app.request('/auth/login', { method: 'POST' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(events).toEqual([
      'body:1024',
      'rate:ip',
      'rate:account',
      'permission:all:account.read:7'
    ])

    events.length = 0
    expect((await app.request('/auth/login')).status).toBe(404)
    expect(events).toEqual([])
  })
})
