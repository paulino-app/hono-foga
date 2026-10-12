import type { Context } from 'hono'
import type { RouteConfig } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import {
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  REQUEST_TOO_LONG,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
  UNPROCESSABLE_ENTITY
} from '../data/httpStatusCodes.js'
import jsonContent from '../openapi/helpers/json-content.js'
import { ErrorResponse } from '../openapi/helpers/json-internal-error.js'
import jsonMessage from '../openapi/helpers/json-message.js'

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

export function Controller() {
  return (_target: any) => {}
}

type MaybeAsync<T> = T | Promise<T>

const ValidationErrorResponse = jsonContent(
  z.object({
    success: z.literal(false),
    error: z.object({
      issues: z.array(z.unknown()),
      name: z.string()
    })
  }),
  'Invalid request'
)

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
  auth?: boolean
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
  auth?: boolean
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
    if (options.permission && options.permission.length === 0) {
      throw new TypeError('permission must not be empty')
    }
    if (Array.isArray(options.rateLimit) && options.rateLimit.length === 0) {
      throw new TypeError('rateLimit must not be empty')
    }

    return (
      _target: any,
      _propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const {
        auth,
        bodyLimit,
        rateLimit,
        permission,
        permissionMode,
        getPermissionScope,
        getPermissionOrgId,
        ...routeConfig
      } = options

      const policyResponses = {
        [INTERNAL_SERVER_ERROR]: ErrorResponse,
        ...(auth || permission
          ? { [UNAUTHORIZED]: jsonMessage('Authentication required') }
          : {}),
        ...(permission
          ? { [FORBIDDEN]: jsonMessage('Permission required') }
          : {}),
        ...(bodyLimit
          ? { [REQUEST_TOO_LONG]: jsonMessage('Request body is too large') }
          : {}),
        ...(rateLimit
          ? { [TOO_MANY_REQUESTS]: jsonMessage('Too many requests') }
          : {}),
        ...(routeConfig.request
          ? { [UNPROCESSABLE_ENTITY]: ValidationErrorResponse }
          : {}),
        ...routeConfig.responses
      }

      registeredRoutes.push({
        options: {
          ...routeConfig,
          security:
            (auth || permission) && routeConfig.security === undefined
              ? [{ bearerAuth: [] }]
              : routeConfig.security,
          responses: policyResponses
        },
        handler: descriptor.value,
        auth,
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
