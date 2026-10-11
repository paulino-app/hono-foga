import type { Context } from 'hono'
import type {
  PermissionConfig,
  PermissionMode,
  PermissionScope
} from '../../decorators/controller.js'
import type {
  CreatePermissionGuard,
  PermissionGuardConfig
} from '../registerModules.js'

type MaybeAsync<T> = T | Promise<T>

export interface PermissionAuthorizationRequest<Principal> {
  principal: Principal
  permissions: PermissionConfig[]
  mode: PermissionMode
  scope: PermissionScope
}

export interface PermissionGuardFactoryOptions<Principal> {
  authenticate: (context: Context) => MaybeAsync<Principal | null>
  authorize: (
    request: PermissionAuthorizationRequest<Principal>,
    context: Context
  ) => MaybeAsync<boolean>
  onUnauthorized?: (context: Context) => MaybeAsync<Response>
  onForbidden?: (context: Context) => MaybeAsync<Response>
}

export function createPermissionGuardFactory<Principal>(
  options: PermissionGuardFactoryOptions<Principal>
): CreatePermissionGuard {
  return (config: PermissionGuardConfig) => {
    if (config.permissionArray.length === 0) {
      throw new TypeError('permissionArray must not be empty')
    }

    return async (context, next) => {
      const principal = await options.authenticate(context)

      if (principal === null) {
        return options.onUnauthorized
          ? options.onUnauthorized(context)
          : context.json({ message: 'Unauthorized' }, 401)
      }

      const scope = { ...((await config.getScope?.(context)) ?? {}) }
      const organizationId =
        scope.organizationId === undefined
          ? await config.getOrgId?.(context)
          : undefined

      if (
        organizationId !== null &&
        organizationId !== undefined &&
        scope.organizationId === undefined
      ) {
        scope.organizationId = organizationId
      }

      const allowed = await options.authorize(
        {
          principal,
          permissions: config.permissionArray,
          mode: config.permissionMode,
          scope
        },
        context
      )

      if (!allowed) {
        return options.onForbidden
          ? options.onForbidden(context)
          : context.json({ message: 'Forbidden' }, 403)
      }

      return next()
    }
  }
}
