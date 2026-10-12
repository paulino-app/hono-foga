/**
 * Auto-registers HTTP modules from a directory. Each subdirectory must export
 * `registeredRoutes` from its controllers.ts entry. Routes get mounted under
 * a `/<name>` prefix on the given app.
 *
 * Routes that declare authentication or permissions require their respective
 * guards. Missing configuration fails during startup instead of mounting a
 * route without protection.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRoute, type RouteConfig } from '@hono/zod-openapi'
import type { Context, MiddlewareHandler } from 'hono'
import type {
  BodyLimitConfig,
  PermissionConfig,
  PermissionMode,
  PermissionScope,
  RateLimitConfig
} from '../decorators/controller.js'
import createRouter from './createRouter.js'
import type { AppOpenAPI } from './types.js'

interface RegisteredRoute {
  options: RouteConfig
  handler: (...args: any[]) => any
  auth?: boolean
  bodyLimit?: BodyLimitConfig
  rateLimit?: RateLimitConfig[]
  permission?: PermissionConfig[]
  permissionMode?: PermissionMode
  getPermissionScope?: (context: Context) => any
  getPermissionOrgId?: (context: Context) => any
}

export interface PermissionGuardConfig {
  permissionArray: PermissionConfig[]
  permissionMode: PermissionMode
  getScope?: (
    context: Context
  ) =>
    | PermissionScope
    | null
    | undefined
    | Promise<PermissionScope | null | undefined>
  getOrgId?: (context: Context) => any
}

export type CreatePermissionGuard = (
  config: PermissionGuardConfig
) => MiddlewareHandler
export type CreateAuthGuard = () => MiddlewareHandler

type CreateBodyLimit = (config: BodyLimitConfig) => MiddlewareHandler
type CreateRateLimit = (config: RateLimitConfig) => MiddlewareHandler

export interface RegisterModulesOptions {
  modulesDir: string
  controllersFileName?: string
  importPath?: (name: string) => string
  createBodyLimit?: CreateBodyLimit
  createRateLimit?: CreateRateLimit
  authGuard?: CreateAuthGuard
  permissionGuard?: CreatePermissionGuard
}

export async function registerModules(
  app: AppOpenAPI,
  options: RegisterModulesOptions
) {
  const {
    modulesDir,
    controllersFileName = 'controllers.ts',
    importPath = (name: string) =>
      pathToFileURL(join(modulesDir, name, controllersFileName)).href,
    createBodyLimit,
    createRateLimit,
    authGuard,
    permissionGuard
  } = options

  if (!existsSync(modulesDir)) {
    return
  }

  const entries = readdirSync(modulesDir).sort()

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

    if (registeredRoutes === undefined) {
      continue
    }

    if (!Array.isArray(registeredRoutes)) {
      throw new TypeError(
        `${controllersFile} must export registeredRoutes as an array`
      )
    }

    if (registeredRoutes.length === 0) {
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

      if (route.auth && !route.permission?.length && !authGuard) {
        throw new Error(
          `Route ${routeLabel} requires authentication but authGuard is not configured`
        )
      }

      if (route.auth && !route.permission?.length && authGuard) {
        middlewares.push(authGuard())
      }

      if (route.permission?.length && !permissionGuard) {
        throw new Error(
          `Route ${routeLabel} declares permissions but permissionGuard is not configured`
        )
      }

      if (route.permission?.length && permissionGuard) {
        middlewares.push(
          permissionGuard({
            permissionArray: route.permission,
            permissionMode: route.permissionMode ?? 'any',
            getScope: route.getPermissionScope,
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
