import {
  OpenApiGeneratorV3,
  OpenAPIRegistry
} from '@asteasolutions/zod-to-openapi'
import type { SchemaObject, ReferenceObject } from 'openapi3-ts/oas30'

import type { ZodSchema } from './types.js'

const oneOf = <T extends ZodSchema>(
  schemas: T[]
): (SchemaObject | ReferenceObject)[] => {
  const registry = new OpenAPIRegistry()

  schemas.forEach((schema, index) => {
    registry.register(index.toString(), schema)
  })

  const generator = new OpenApiGeneratorV3(registry.definitions)
  const components = generator.generateComponents()

  return components.components?.schemas
    ? Object.values(components.components!.schemas!)
    : []
}

export default oneOf
