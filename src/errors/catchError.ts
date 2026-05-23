type Result<T> = [T, null] | [null, Error]

export default async function catchError<T>(
  promise: Promise<T>
): Promise<Result<T>> {
  try {
    const data = await promise
    return [data, null]
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))]
  }
}
