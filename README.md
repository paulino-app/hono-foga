# hono-foga

Bun-first toolkit for [Hono](https://hono.dev) services: application assembly, OpenAPI helpers, route decorators, a convention over configuration module loader, status codes, validation and small utilities.

## Install

```sh
bun add hono-foga
```

`hono-foga` keeps its runtime surface small and treats the heavy framework pieces as peer dependencies, so you install them once in your app and the toolkit reuses your versions:

```sh
bun add hono @hono/zod-openapi zod @asteasolutions/zod-to-openapi
# optional, only if you use the matching helpers
bun add @scalar/hono-api-reference
```

| Peer                             | Required | Used by                            |
| -------------------------------- | -------- | ---------------------------------- |
| `hono`                           | yes      | everything                         |
| `@hono/zod-openapi`              | yes      | routers, OpenAPI route definitions |
| `zod`                            | yes      | validation, schemas                |
| `@asteasolutions/zod-to-openapi` | yes      | `oneOf` OpenAPI helpers            |
| `@scalar/hono-api-reference`     | optional | the Scalar reference UI            |

## Usage

The root export groups the toolkit by namespace:

```ts
import { framework, decorators, openapi, validation } from 'hono-foga'
```

Or import a single area through its subpath for smaller imports:

```ts
import { jsonContent } from 'hono-foga/openapi/helpers'
import { createRouteRegistry } from 'hono-foga/decorators'
```

Scalar is isolated from the framework barrel so projects that do not use the
reference UI do not need to install it:

```ts
import configureOpenAPI from 'hono-foga/openapi/scalar'
```

JWT secrets are always explicit and empty secrets are rejected:

```ts
import { createJwt } from 'hono-foga/security'

const jwt = createJwt({
  secret: env.ACCESS_TOKEN_SECRET,
  issuer: 'example-api',
  audience: 'example-api-clients',
  expiresInSeconds: 3600
})
const token = await jwt.sign({ id: 42 })
```

Routes can use `auth: true` when they only require a valid identity, or declare
`permission` when they also require authorization. `registerModules` requires
`authGuard` for auth-only routes and `permissionGuard` for permission routes;
registration fails during startup if either guard is missing. `auth: true` also
documents `bearerAuth` in OpenAPI unless the route provides an explicit
`security` configuration.

Route policies add their common OpenAPI responses automatically: `auth` adds
`401`, `permission` adds `401` and `403`, `bodyLimit` adds `413`, `rateLimit`
adds `429`, and request validation adds `422`. Explicit route responses take
precedence, so `responses` can focus on successful and domain-specific cases.

`createApp()` owns the standard application assembly and accepts either a
minimal module configuration or complete runtime hooks:

```ts
import { createApp, serveApp } from 'hono-foga/framework'

const app = await createApp({})

const configuredApp = await createApp({
  mode: 'development',
  bootstrap: migrateDatabase,
  cors: { origin: ['https://example.com'] },
  logger: { timeZone: 'UTC' },
  root: { name: 'Example API', version: '1.0.0' },
  memoryRateLimit: {
    identifyClient: (context) => getClientAddress(context),
    maxBuckets: 10_000
  },
  authGuard: createAuthGuard,
  permissionGuard: createPermissionGuard,
  openapi: {
    title: 'Example API',
    version: '1.0.0'
  }
})

const server = serveApp(configuredApp, {
  port: 9000,
  shutdown: {
    timeoutMs: 10_000,
    cleanup: closeDatabase,
    onSignal: (signal) => console.log(`Received ${signal}`)
  }
})
```

Compression and a conservative 1 MiB global body ceiling are enabled by default.
Route-specific body limits can tighten, but not raise, that ceiling. CORS,
request logging, rate limiting, guards, bootstrap and application-specific
routes are explicit. Modules default to `./src/app` relative to the working
directory; use `modulesDir` to select another directory or `false` to disable
discovery. A missing modules directory is valid.

`createApp()` only assembles the application. Start it with `Bun.serve()` or the
`serveApp()` helper after assembly. Graceful shutdown is opt-in: when configured,
`serveApp()` handles `SIGTERM` and `SIGINT`, waits for active requests, forces a
server stop after the drain timeout, and then runs the application cleanup
callback. Cleanup should have its own finite timeouts because it is not forcibly
cancelled. Use
`createGracefulShutdown()` when managing a custom Bun server. The optional
`bootstrap` callback runs after configuration and route registration succeed,
but before `createApp()` returns. Each call creates its own in-memory rate-limit
store.
OpenAPI and Scalar routes are exposed by default only in `development` mode;
`openapi.enabled` can override that behavior explicitly.

`createPermissionGuardFactory` handles authentication, `401`/`403` responses,
permission modes, and generic route scopes while applications retain ownership
of identity verification and permission storage:

```ts
import { createPermissionGuardFactory } from 'hono-foga/framework/middlewares'

const createPermissionGuard = createPermissionGuardFactory({
  authenticate: (context) => verifyRequestIdentity(context),
  authorize: ({ principal, permissions, mode, scope }) =>
    permissionStore.authorize({ principal, permissions, mode, scope })
})

await registerModules(app, {
  modulesDir,
  authGuard: () => authenticateRequest,
  permissionGuard: createPermissionGuard
})
```

Routes can declare `permissionMode: 'any' | 'all'` and resolve arbitrary scope
data with `getPermissionScope`. The older `getPermissionOrgId` resolver remains
supported and is exposed to guards as `scope.organizationId`.

Request policies can live beside each route's OpenAPI contract:

```ts
import { createMemoryRateLimitFactory } from 'hono-foga/framework/middlewares'

@Route({
  method: 'post',
  path: '/login',
  bodyLimit: { maxSize: 16_384 },
  rateLimit: [
    { keyPrefix: 'login-ip', max: 10, windowSeconds: 60 },
    { keyPrefix: 'login-account', max: 5, windowSeconds: 60 }
  ],
  responses: { 200: { description: 'Signed in' } }
})
static login(context: Context) {
  // ...
}

const createRateLimit = createMemoryRateLimitFactory({
  identifyClient: (context) => getClientAddress(context),
  maxBuckets: 10_000
})

await registerModules(app, {
  modulesDir,
  createBodyLimit: (config) => createAppBodyLimit(config),
  createRateLimit
})
```

Declaring either policy without its corresponding factory fails during startup.
`rateLimit` accepts one configuration or an ordered array of configurations.
The bundled in-memory factory owns counters, expiration, capacity protection,
`429` responses and `Retry-After`. At capacity it clears expired buckets and
fails closed for new identities until the nearest reset instead of evicting an
active limit. Applications still provide client identity resolution so proxy
trust and runtime-specific connection APIs remain explicit.

## Version 2.5 migration

Version 2.5 is Bun-only and contains intentional breaking changes:

- `createApp()` no longer accepts `port` or starts a server.
- JWT helpers require `issuer`, `audience`, and `expiresInSeconds`.
- Removed decorator options that were accepted but not implemented.
- Removed the unused `writeError` data export.
- Unexpected errors, including 5xx `HTTPException` values, are private unless
  development exposure or an explicit `expose` marker is used.

Operational endpoints are independent middlewares, so applications control
their order and authentication policy:

```ts
import {
  createAbout,
  createAlive,
  createHealth
} from 'hono-foga/framework/middlewares'

app.use(createAbout({ info: { name: 'Example API', version: '1.0.0' } }))
app.use(createAlive())
app.use(
  createHealth({
    version: '1.0.0',
    checks: {
      database: () => database.execute('select 1'),
      redis: () => redis.ping()
    }
  })
)
```

The request logger exposes structured entries for project-specific formatting
and sinks:

```ts
import { createLogger } from 'hono-foga/framework/middlewares'

app.use(
  createLogger({
    timeZone: 'America/Mexico_City',
    skip: (context) => context.req.path === '/alive',
    enrich: (context) => ({ actor: context.get('accountId') }),
    sink: (message) => logger.info(message)
  })
)
```

Use an explicit base directory instead of relying on the process working
directory when resolving application files:

```ts
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPathResolver } from 'hono-foga/data'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const resolvePath = createPathResolver(currentDirectory)
```

### Available subpaths

`data`, `decorators`, `errors`, `formatting`, `framework`, `framework/context`, `framework/middlewares/*`, `network`, `openapi`, `openapi/helpers`, `openapi/scalar`, `openapi/schemas`, `security`, `utils`, `validation`, `polyfill/compression`.

## Development

```sh
bun install
bun run build      # tsc -p tsconfig.build.json -> ./dist
bun run dev        # tsc watch
bun run lint
bun run pretty
```

Only the compiled `dist/` is published (see `files` in `package.json`); the build runs automatically on `prepare` and `prepublishOnly`.

## License

MIT
