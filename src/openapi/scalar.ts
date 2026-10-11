/**
 * Wires up the OpenAPI document and Scalar reference UI. This entrypoint is
 * separate so framework users do not need Scalar unless they enable the UI.
 */
import { apiReference } from '@scalar/hono-api-reference'
import type { AppOpenAPI } from '../framework/types.js'

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
