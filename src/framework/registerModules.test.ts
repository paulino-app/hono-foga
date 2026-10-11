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
})
