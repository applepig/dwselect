import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildCategoryRoutes } from '../scripts/build-category-routes'

type Dirs = { products_dir: string, guides_dir: string, links_dir: string }

function makeContentDirs(content: {
  products?: Record<string, object>
  guides?: Record<string, object>
  links?: Record<string, object>
}): Dirs {
  const products_dir = mkdtempSync(join(tmpdir(), 'cat-products-'))
  const guides_dir = mkdtempSync(join(tmpdir(), 'cat-guides-'))
  const links_dir = mkdtempSync(join(tmpdir(), 'cat-links-'))

  writeAll(products_dir, content.products)
  writeAll(guides_dir, content.guides)
  writeAll(links_dir, content.links)

  return { products_dir, guides_dir, links_dir }
}

function writeAll(dir: string, files: Record<string, object> = {}) {
  for (const [file_name, payload] of Object.entries(files)) {
    writeFileSync(join(dir, file_name), JSON.stringify(payload))
  }
}

function cleanup(dirs: Dirs) {
  for (const dir of Object.values(dirs)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('buildCategoryRoutes', () => {
  it('should build a /category/:id route for every category with at least one published item', () => {
    const dirs = makeContentDirs({
      products: { 'a.json': { status: 'published', category_id: 'computer', tag_ids: [] } },
      guides: { 'g.json': { status: 'published', category_ids: ['home', 'kitchen'], tag_ids: [] } },
      links: { 'l.json': { status: 'published', category_ids: ['other'], tag_ids: [] } },
    })

    try {
      expect(buildCategoryRoutes(dirs).toSorted()).toEqual([
        '/category/computer',
        '/category/home',
        '/category/kitchen',
        '/category/other',
      ])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should exclude categories whose only associated items are not published', () => {
    const dirs = makeContentDirs({
      products: {
        'live.json': { status: 'published', category_id: 'computer', tag_ids: [] },
        'draft.json': { status: 'draft', category_id: 'draft-only-cat', tag_ids: [] },
      },
    })

    try {
      const routes = buildCategoryRoutes(dirs)

      expect(routes).toEqual(['/category/computer'])
      expect(routes).not.toContain('/category/draft-only-cat')
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should not duplicate a category route when several published items share the category', () => {
    const dirs = makeContentDirs({
      products: {
        'a.json': { status: 'published', category_id: 'computer', tag_ids: [] },
        'b.json': { status: 'published', category_id: 'computer', tag_ids: [] },
      },
      guides: { 'g.json': { status: 'published', category_ids: ['computer'], tag_ids: [] } },
    })

    try {
      expect(buildCategoryRoutes(dirs)).toEqual(['/category/computer'])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should return no routes when there is no published content', () => {
    const dirs = makeContentDirs({
      products: { 'draft.json': { status: 'draft', category_id: 'computer', tag_ids: [] } },
    })

    try {
      expect(buildCategoryRoutes(dirs)).toEqual([])
    }
    finally {
      cleanup(dirs)
    }
  })
})
