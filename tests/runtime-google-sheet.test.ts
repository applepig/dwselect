import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { findRuntimeGoogleSheetReferences } from '../scripts/assert-runtime-google-sheet-clean'

describe('runtime Google Sheets references', () => {
  it('should ignore legacy, docs, migration script, and tests references', () => {
    const root_path = makeFixtureRoot()
    writeFileSync(join(root_path, 'legacy/index.html'), 'https://docs.google.com/spreadsheets/d/example/pub?output=tsv')
    writeFileSync(join(root_path, 'docs/spec.md'), 'docs.google.com/spreadsheets is allowed in docs')
    writeFileSync(join(root_path, 'scripts/legacy/migrate-google-sheet-products.ts'), 'const source = "pub?output=tsv"')
    writeFileSync(join(root_path, 'tests/runtime.test.ts'), 'docs.google.com/spreadsheets')

    const result = findRuntimeGoogleSheetReferences(root_path)

    expect(result).toEqual([])
  })

  it('should report Google Sheets indicators in public runtime source files', () => {
    const root_path = makeFixtureRoot()
    writeFileSync(join(root_path, 'app/pages/index.vue'), 'fetch("https://docs.google.com/spreadsheets/d/example/pub?output=tsv")')

    const result = findRuntimeGoogleSheetReferences(root_path)

    expect(result).toEqual([
      expect.objectContaining({
        relative_path: 'app/pages/index.vue',
        indicator: 'docs.google.com/spreadsheets',
      }),
      expect.objectContaining({
        relative_path: 'app/pages/index.vue',
        indicator: 'pub?output=tsv',
      }),
    ])
  })

  it('should scan static build output when it exists', () => {
    const root_path = makeFixtureRoot()
    writeFileSync(join(root_path, '.output/public/_nuxt/app.js'), 'const sheet = "pub?output=tsv"')

    const result = findRuntimeGoogleSheetReferences(root_path)

    expect(result).toEqual([
      expect.objectContaining({
        relative_path: '.output/public/_nuxt/app.js',
        indicator: 'pub?output=tsv',
      }),
    ])
  })
})

function makeFixtureRoot() {
  const root_path = join(tmpdir(), `dwselect-runtime-google-sheet-${randomUUID()}`)
  const directories = [
    'app/pages',
    'content',
    'docs',
    'legacy',
    'scripts/legacy',
    'tests',
    '.output/public/_nuxt',
  ]

  for (const directory of directories) {
    mkdirSync(join(root_path, directory), { recursive: true })
  }

  writeFileSync(join(root_path, 'content.config.ts'), 'export default {}')
  writeFileSync(join(root_path, 'nuxt.config.ts'), 'export default {}')

  return root_path
}
