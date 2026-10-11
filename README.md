# hono-foga

Shared toolkit for [Hono](https://hono.dev) services running on Bun or Node: OpenAPI helpers, route decorators, a convention over configuration module loader, status codes, validation and small utilities.

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

const jwt = createJwt({ secret: env.ACCESS_TOKEN_SECRET })
const token = await jwt.sign({ id: 42 })
```

Routes that declare `permission` require `createPermissionGuard` when calling
`registerModules`. Registration fails during startup if the guard is missing.
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

await registerModules(app, { modulesDir, createPermissionGuard })
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
`429` responses and `Retry-After`. Applications still provide client identity
resolution so proxy trust and runtime-specific connection APIs remain explicit.

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
