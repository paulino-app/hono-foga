import '../polyfill/compression.js'
import type { ErrorHandler, MiddlewareHandler, NotFoundHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { resolve } from 'node:path'
import type { ConfigureOpenAPIOptions } from '../openapi/scalar.js'
import type { BodyLimitConfig } from '../decorators/controller.js'
import createRouter, { type CreateRouterOptions } from './createRouter.js'
import { createLogger, type LoggerOptions } from './middlewares/logger.js'
import {
  createMemoryRateLimitFactory,
  type MemoryRateLimitFactoryOptions
} from './middlewares/memoryRateLimit.js'
import notFound from './middlewares/notFound.js'
import { createOnError } from './middlewares/onError.js'
import {
  registerModules,
  type RegisterModulesOptions
} from './registerModules.js'
import type { AppOpenAPI } from './types.js'

type MaybePromise<T> = T | Promise<T>
export type RootResponse = Record<string, string | number | boolean | null>
export type CreateAppOpenAPIOptions = Omit<ConfigureOpenAPIOptions, 'mode'>
export type CreateAppSecureHeadersOptions = NonNullable<
  Parameters<typeof secureHeaders>[0]
>

const DEFAULT_SECURE_HEADERS: CreateAppSecureHeadersOptions = {
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  strictTransportSecurity: false,
  xDnsPrefetchControl: false,
  xDownloadOptions: false,
  xPermittedCrossDomainPolicies: false,
  xXssProtection: false,
  referrerPolicy: 'no-referrer',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY'
}

export interface CreateAppOptions extends Omit<
  RegisterModulesOptions,
  'modulesDir'
> {
  bootstrap?: () => MaybePromise<void>
  modulesDir?: string | false
  mode?: string
  router?: CreateRouterOptions
  bodyLimit?: false | BodyLimitConfig
  secureHeaders?: false | CreateAppSecureHeadersOptions
  cors?: false | Parameters<typeof cors>[0]
  compression?: false | Parameters<typeof compress>[0]
  logger?: false | LoggerOptions
  memoryRateLimit?: MemoryRateLimitFactoryOptions
  middlewares?: MiddlewareHandler[]
  root?: RootResponse
  openapi?: CreateAppOpenAPIOptions
  configure?: (app: AppOpenAPI) => MaybePromise<void>
  notFound?: false | NotFoundHandler
  onError?: ErrorHandler
}

export default async function createApp(
  options: CreateAppOptions = {}
): Promise<AppOpenAPI> {
  const app = createRouter(options.router) as AppOpenAPI

  if (options.bodyLimit !== false) {
    const { maxSize = 1_048_576, message = 'Request body is too large' } =
      options.bodyLimit ?? {}
    app.use(
      '*',
      bodyLimit({
        maxSize,
        onError: (context) => context.json({ message }, 413)
      })
    )
  }
  if (options.secureHeaders !== false) {
    app.use(
      '*',
      secureHeaders({
        ...DEFAULT_SECURE_HEADERS,
        ...options.secureHeaders
      })
    )
  }
  if (options.cors !== false && options.cors !== undefined) {
    app.use('*', cors(options.cors))
  }
  if (options.compression !== false) {
    app.use('*', compress(options.compression))
  }
  if (options.logger !== false && options.logger !== undefined) {
    app.use('*', createLogger(options.logger))
  }

  for (const middleware of options.middlewares ?? []) {
    app.use('*', middleware)
  }

  if (options.notFound !== false) {
    app.notFound(options.notFound ?? notFound)
  }
  app.onError(options.onError ?? createOnError({ mode: options.mode }))

  if (options.root) {
    app.get('/', (context) => context.json(options.root))
  }
  if (options.openapi) {
    const { default: configureOpenAPI } = await import('../openapi/scalar.js')
    configureOpenAPI(app, { ...options.openapi, mode: options.mode })
  }
  await options.configure?.(app)

  if (options.modulesDir !== false) {
    await registerModules(app, {
      modulesDir: options.modulesDir ?? resolve(process.cwd(), 'src', 'app'),
      controllersFileName: options.controllersFileName,
      importPath: options.importPath,
      createBodyLimit:
        options.createBodyLimit ??
        (({ maxSize, message = 'Request body is too large' }) =>
          bodyLimit({
            maxSize,
            onError: (context) => context.json({ message }, 413)
          })),
      createRateLimit:
        options.createRateLimit ??
        (options.memoryRateLimit
          ? createMemoryRateLimitFactory(options.memoryRateLimit)
          : undefined),
      authGuard: options.authGuard,
      permissionGuard: options.permissionGuard
    })
  }

  await options.bootstrap?.()

  return app
}
