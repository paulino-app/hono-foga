import type { z } from '@hono/zod-openapi'

// Accept any zod schema. Helpers pipe it straight to z.openapi which itself
// is happy with any ZodType, so being narrower here just blocks legitimate
// callers (arrays of primitives, ZodEffects, refinements, etc.).
export type ZodSchema = z.ZodType
