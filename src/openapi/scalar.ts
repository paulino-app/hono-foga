/**
 * Wires up the OpenAPI document and Scalar reference UI. This entrypoint is
 * separate so framework users do not need Scalar unless they enable the UI.
 */
import { apiReference } from '@scalar/hono-api-reference'
import type { OpenAPIObject } from 'openapi3-ts/oas30'
import type { AppOpenAPI } from '../framework/types.js'

export interface ConfigureOpenAPIOptions {
  enabled?: boolean
  mode?: string
  title: string
  version: string
  description?: string
  docPath?: string
  referencePath?: string
}

export function normalizeOpenAPIPaths(document: OpenAPIObject): OpenAPIObject {
  if (!document.paths) {
    return document
  }

  const paths: NonNullable<OpenAPIObject['paths']> = {}
  for (const [path, item] of Object.entries(document.paths)) {
    const normalizedPath = path
      .replace(/\/:([A-Za-z_][A-Za-z0-9_]*)\{[^/]+\}(?=\/|$)/g, '/{$1}')
      .replace(/\/:([A-Za-z_][A-Za-z0-9_]*)(?=\/|\.|$)/g, '/{$1}')
    if (/(?:^|\/):/.test(normalizedPath)) {
      throw new Error(
        `Unsupported Hono parameter syntax in OpenAPI path: ${path}`
      )
    }
    if (normalizedPath in paths) {
      throw new Error(`OpenAPI path collision after normalization: ${path}`)
    }
    paths[normalizedPath] = item
  }

  return { ...document, paths }
}

export function createOpenAPIDocument(
  app: AppOpenAPI,
  options: Pick<ConfigureOpenAPIOptions, 'title' | 'version' | 'description'>
) {
  return normalizeOpenAPIPaths(
    app.getOpenAPIDocument({
      openapi: '3.0.0',
      info: {
        title: options.title,
        version: options.version,
        description: options.description ?? 'Documentación oficial'
      },
      security: []
    }) as OpenAPIObject
  )
}

export default function configureOpenAPI(
  app: AppOpenAPI,
  options: ConfigureOpenAPIOptions
) {
  const {
    mode,
    enabled = mode === 'development',
    title,
    version,
    description = 'Documentación oficial',
    docPath = '/doc',
    referencePath = '/reference'
  } = options

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT'
  })

  if (!enabled) {
    return
  }

  app.get(docPath, (context) =>
    context.json(createOpenAPIDocument(app, { title, version, description }))
  )

  app.get(
    referencePath,
    apiReference({
      cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.73.1',
      theme: 'kepler',
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch'
      },
      spec: {
        url: docPath
      },
      authentication: {
        preferredSecurityScheme: 'bearerAuth',
        http: {
          bearer: {
            token: ''
          }
        }
      }
    })
  )
}
