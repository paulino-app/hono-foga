/**
 * Wires up the OpenAPI document at /doc and the Scalar reference UI at
 * /reference. The caller passes mode + title/version so the package does not
 * read env or read a package.json.
 */
import { apiReference } from '@scalar/hono-api-reference'
import type { AppOpenAPI } from './types.js'

export interface ConfigureOpenAPIOptions {
  mode?: string
  title: string
  version: string
  description?: string
  docPath?: string
  referencePath?: string
}

export default function configureOpenAPI(
  app: AppOpenAPI,
  options: ConfigureOpenAPIOptions
) {
  const {
    mode,
    title,
    version,
    description = 'Documentación oficial',
    docPath = '/doc',
    referencePath = '/reference'
  } = options

  if (mode === 'production') {
    return
  }

  app.doc(docPath, {
    openapi: '3.0.0',
    info: {
      version,
      title,
      description
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: []
  } as Parameters<typeof app.doc>[1])

  app.get(
    referencePath,
    apiReference({
      cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest',
      theme: 'kepler',
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch'
      },
      spec: {
        url: docPath
      },
      authentication: {
        preferredSecurityScheme: 'BearerAuth',
        http: {
          bearer: {
            token: ''
          }
        }
      }
    })
  )
}
