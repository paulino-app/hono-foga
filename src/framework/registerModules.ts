/**
 * Auto-registers HTTP modules from a directory. Each subdirectory must export
 * `registeredRoutes` from its controllers.ts entry. Routes get mounted under
 * a `/<name>` prefix on the given app.
 *
 * Routes that declare permissions require `createPermissionGuard`. Missing
 * permission configuration fails during startup instead of mounting the route
 * without authorization.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRoute, type RouteConfig } from '@hono/zod-openapi'
import type { Context, MiddlewareHandler } from 'hono'
import type {
  BodyLimitConfig,
  PermissionConfig,
  RateLimitConfig
} from '../decorators/controller.js'
import createRouter from './createRouter.js'
import type { AppOpenAPI } from './types.js'

interface RegisteredRoute {
  options: RouteConfig
  handler: (...args: any[]) => any
  bodyLimit?: BodyLimitConfig
  rateLimit?: RateLimitConfig[]
  permission?: PermissionConfig[]
  getPermissionOrgId?: (context: Context) => any
}

type CreatePermissionGuard = (args: {
  permissionArray: PermissionConfig[]
  getOrgId?: (context: Context) => any
}) => MiddlewareHandler

type CreateBodyLimit = (config: BodyLimitConfig) => MiddlewareHandler
type CreateRateLimit = (config: RateLimitConfig) => MiddlewareHandler

export interface RegisterModulesOptions {
  modulesDir: string
  controllersFileName?: string
  importPath?: (name: string) => string
  createBodyLimit?: CreateBodyLimit
  createRateLimit?: CreateRateLimit
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
    createBodyLimit,
    createRateLimit,
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
      const routeLabel = `${route.options.method.toUpperCase()} /${name}${route.options.path}`
      const middlewares: MiddlewareHandler[] = []

      if (route.bodyLimit && !createBodyLimit) {
        throw new Error(
          `Route ${routeLabel} declares a body limit but createBodyLimit is not configured`
        )
      }

      if (route.bodyLimit && createBodyLimit) {
        middlewares.push(createBodyLimit(route.bodyLimit))
      }

      if (route.rateLimit?.length && !createRateLimit) {
        throw new Error(
          `Route ${routeLabel} declares rate limits but createRateLimit is not configured`
        )
      }

      if (route.rateLimit && createRateLimit) {
        middlewares.push(...route.rateLimit.map(createRateLimit))
      }

      if (route.permission && !createPermissionGuard) {
        throw new Error(
          `Route ${routeLabel} declares permissions but createPermissionGuard is not configured`
        )
      }

      if (route.permission && createPermissionGuard) {
        middlewares.push(
          createPermissionGuard({
            permissionArray: route.permission,
            getOrgId: route.getPermissionOrgId
          })
        )
      }

      for (const middleware of middlewares) {
        router.use(route.options.path, (context, next) => {
          if (
            context.req.method.toLowerCase() !==
            route.options.method.toLowerCase()
          ) {
            return next()
          }

          return middleware(context, next)
        })
      }

      router.openapi(createRoute(route.options), route.handler)
    }

    app.route(`/${name}`, router)
  }
}
