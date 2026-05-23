import { z } from 'zod'

export const idNumber = z.object({
  id: z.preprocess((val) => Number(val), z.number())
})

export const idNumberOptional = z.object({
  id: z.preprocess(
    (val) => (val !== undefined ? Number(val) : undefined),
    z.number().optional()
  )
})

export const idString = (name: string) => {
  return z.object({
    [name]: z.string()
  })
}

export const idStringOptional = (name: string) => {
  return z.object({
    [name]: z.string().optional()
  })
}

export const date = z.string().refine((value) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
})
