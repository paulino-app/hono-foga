import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
  if (subpath.includes('*')) {
    continue
  }

  for (const target of Object.values(conditions)) {
    if (!existsSync(resolve(target))) {
      throw new Error(`Missing export target ${subpath}: ${target}`)
    }
  }
}

await Promise.all([
  import('../dist/index.js'),
  import('../dist/data/index.js'),
  import('../dist/decorators/index.js'),
  import('../dist/framework/index.js'),
  import('../dist/openapi/helpers/index.js'),
  import('../dist/security/index.js')
])
