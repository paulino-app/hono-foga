import type { ZodSchema } from './types.ts'

const formData = <T extends ZodSchema>(schema: T, description: string) => {
  return {
    content: {
      'multipart/form-data': {
        schema
      }
    },
    description
  }
}

export default formData
