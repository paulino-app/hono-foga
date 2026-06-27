# hono-foga

Shared toolkit for [Hono](https://hono.dev) based services running on [Bun](https://bun.sh): OpenAPI helpers, route decorators, a convention over configuration module loader, status codes, validation and small utilities.

## Install

```sh
bun add hono-foga
```

`hono-foga` keeps its runtime surface small and treats the heavy framework pieces as peer dependencies, so you install them once in your app and the toolkit reuses your versions:

```sh
bun add hono @hono/zod-openapi zod
# optional, only if you use the matching helpers
bun add @scalar/hono-api-reference
```

| Peer | Required | Used by |
| --- | --- | --- |
| `hono` | yes | everything |
| `@hono/zod-openapi` | yes | routers, OpenAPI route definitions |
| `zod` | yes | validation, schemas |
| `@scalar/hono-api-reference` | optional | the Scalar reference UI |

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

### Available subpaths

`data`, `decorators`, `errors`, `formatting`, `framework`, `framework/context`, `framework/middlewares/*`, `network`, `openapi`, `openapi/helpers`, `openapi/schemas`, `security`, `utils`, `validation`, `polyfill/compression`.

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
