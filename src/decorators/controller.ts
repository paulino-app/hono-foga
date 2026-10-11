import type { Context } from 'hono'
import type { RouteConfig } from '@hono/zod-openapi'
import { INTERNAL_SERVER_ERROR } from '../data/httpStatusCodes.js'
import { ErrorResponse } from '../openapi/helpers/json-internal-error.js'

// Permission descriptor is left generic so the package can stay decoupled from
// any specific permission catalog. Consumers narrow it to their own shape.
export type PermissionConfig = {
  id?: number
  key?: string
  type?: number
  [key: string]: unknown
}

export type PermissionMode = 'any' | 'all'
export type PermissionScope = Record<string, unknown>

export interface ControllerOptions {
  basePath?: string
  tags?: string[]
  description?: string
}

export function Controller(_options: ControllerOptions = {}) {
  return (_target: any) => {}
}

type MaybeAsync<T> = T | Promise<T>

export interface BodyLimitConfig {
  maxSize: number
  message?: string
}

export interface RateLimitConfig {
  keyPrefix: string
  max: number
  windowSeconds: number
  identify?: (context: Context) => MaybeAsync<string | null>
}

export interface ExtendedRouteOptions extends RouteConfig {
  bodyLimit?: BodyLimitConfig
  rateLimit?: RateLimitConfig | RateLimitConfig[]
  permission?: PermissionConfig[]
  permissionMode?: PermissionMode
  getPermissionScope?: (
    context: Context
  ) => MaybeAsync<PermissionScope | null | undefined>
  getPermissionOrgId?: (
    context: Context
  ) => MaybeAsync<number | null | undefined>
}

export type RouteOptions = ExtendedRouteOptions

export interface RegisteredRoute {
  options: RouteConfig
  handler: (...args: any[]) => any
  bodyLimit?: BodyLimitConfig
  rateLimit?: RateLimitConfig[]
  permission?: PermissionConfig[]
  permissionMode?: PermissionMode
  getPermissionScope?: (
    context: Context
  ) => MaybeAsync<PermissionScope | null | undefined>
  getPermissionOrgId?: (
    context: Context
  ) => MaybeAsync<number | null | undefined>
}

export function createRouteRegistry() {
  const registeredRoutes: RegisteredRoute[] = []

  function Route(options: RouteOptions) {
    return (
      _target: any,
      _propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const {
        bodyLimit,
        rateLimit,
        permission,
        permissionMode,
        getPermissionScope,
        getPermissionOrgId,
        ...routeConfig
      } = options

      // Aseguramos que todas las rutas tengan documentado INTERNAL_SERVER_ERROR
      const responsesWithInternalError = {
        ...routeConfig.responses,
        [INTERNAL_SERVER_ERROR]: ErrorResponse
      }

      registeredRoutes.push({
        options: {
          ...routeConfig,
          responses: responsesWithInternalError
        },
        handler: descriptor.value,
        bodyLimit,
        rateLimit: rateLimit
          ? Array.isArray(rateLimit)
            ? rateLimit
            : [rateLimit]
          : undefined,
        permission,
        permissionMode,
        getPermissionScope,
        getPermissionOrgId
      })

      return descriptor
    }
  }

  return { Route, registeredRoutes }
}
