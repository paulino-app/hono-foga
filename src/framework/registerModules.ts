/**
 * Auto-registers HTTP modules from a directory. Each subdirectory must export
 * `registeredRoutes` from its controllers.ts entry. Routes get mounted under
 * a `/<name>` prefix on the given app.
 *
 * Permission handling is optional: pass `createPermissionGuard` to wrap
 * handlers that declare `permission`. If you do not pass it, those handlers
 * are mounted without a guard.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRoute, type RouteConfig } from '@hono/zod-openapi'
import type { Context, MiddlewareHandler } from 'hono'
import type { PermissionConfig } from '../decorators/controller.js'
import createRouter from './createRouter.js'
import type { AppOpenAPI } from './types.js'

interface RegisteredRoute {
  options: RouteConfig
  handler: (...args: any[]) => any
  permission?: PermissionConfig[]
  getPermissionOrgId?: (context: Context) => any
}

type CreatePermissionGuard = (args: {
  permissionArray: PermissionConfig[]
  getOrgId?: (context: Context) => any
}) => MiddlewareHandler

export interface RegisterModulesOptions {
  modulesDir: string
  controllersFileName?: string
  importPath?: (name: string) => string
  createPermissionGuard?: CreatePermissionGuard
}

export async function registerModules(
  app: AppOpenAPI,
  options: RegisterModulesOptions
) {
  const {
    modulesDir,
    controllersFileName = 'controllers.ts',
    importPath = (name: string) => join(modulesDir, name, controllersFileName),
    createPermissionGuard
  } = options

  const entries = readdirSync(modulesDir)

  for (const name of entries) {
    const modulePath = join(modulesDir, name)
    if (!statSync(modulePath).isDirectory()) {
      continue
    }

    const controllersFile = join(modulePath, controllersFileName)
    if (!existsSync(controllersFile)) {
      continue
    }

    const mod = await import(importPath(name))
    const registeredRoutes = mod.registeredRoutes as
      | RegisteredRoute[]
      | undefined

    if (!registeredRoutes || registeredRoutes.length === 0) {
      continue
    }

    const router = createRouter()

    for (const route of registeredRoutes) {
      let handler = route.handler
      if (route.permission && createPermissionGuard) {
        const guard = createPermissionGuard({
          permissionArray: route.permission,
          getOrgId: route.getPermissionOrgId
        })
        handler = async (context, ...args) => {
          return guard(context, async () => {
            return route.handler(context, ...args)
          })
        }
      }
      router.openapi(createRoute(route.options), handler)
    }

    app.route(`/${name}`, router)
  }
}
