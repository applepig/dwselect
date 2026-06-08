import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildProductRoutes } from '../scripts/build-product-routes'

function makeProductsDir(files: Record<string, { status: string }>) {
  const dir = mkdtempSync(join(tmpdir(), 'product-routes-'))

  for (const [file_name, payload] of Object.entries(files)) {
    writeFileSync(join(dir, file_name), JSON.stringify({ id: file_name.replace(/\.json$/, ''), ...payload }))
  }

  return dir
}

describe('buildProductRoutes', () => {
  it('should build a /products/:stem route for each published product', () => {
    const dir = makeProductsDir({
      'a.json': { status: 'published' },
      'b.json': { status: 'published' },
    })

    try {
      expect(buildProductRoutes(dir).toSorted()).toEqual(['/products/a', '/products/b'])
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should exclude products whose status is not published', () => {
    const dir = makeProductsDir({
      'live.json': { status: 'published' },
      'draft.json': { status: 'draft' },
      'gone.json': { status: 'unpublished' },
      'old.json': { status: 'archived' },
    })

    try {
      const routes = buildProductRoutes(dir)

      expect(routes).toEqual(['/products/live'])
      expect(routes).not.toContain('/products/draft')
      expect(routes).not.toContain('/products/gone')
      expect(routes).not.toContain('/products/old')
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should ignore non-json entries in the products directory', () => {
    const dir = makeProductsDir({ 'a.json': { status: 'published' } })
    writeFileSync(join(dir, 'README.md'), '# not a product')

    try {
      expect(buildProductRoutes(dir)).toEqual(['/products/a'])
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('should preserve non-ascii stems from the file name', () => {
    const dir = makeProductsDir({ '2026-06-02-sharp-65吋-xled.json': { status: 'published' } })

    try {
      expect(buildProductRoutes(dir)).toEqual(['/products/2026-06-02-sharp-65吋-xled'])
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
