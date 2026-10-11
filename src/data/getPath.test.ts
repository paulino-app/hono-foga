import { describe, expect, test } from 'bun:test'
import { createPathResolver } from './getPath.js'

describe('createPathResolver', () => {
  test('resolves paths from an explicit base directory', () => {
    const resolvePath = createPathResolver('/srv/example')

    expect(resolvePath('public', 'image.webp')).toBe(
      '/srv/example/public/image.webp'
    )
  })

  test('rejects an empty base directory', () => {
    expect(() => createPathResolver('')).toThrow(
      'Path resolver base directory must not be empty'
    )
  })
})
