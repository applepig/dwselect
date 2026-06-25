import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildBrandRoutes } from '../scripts/build-brand-routes'
import { buildTagRoutes } from '../scripts/build-tag-routes'

type Dirs = { products_dir: string, guides_dir: string, links_dir: string, taxonomies_dir: string }

function makeContentDirs(content: {
  products?: Record<string, object>
  guides?: Record<string, object>
  links?: Record<string, object>
  brand_ids?: string[]
}): Dirs {
  const products_dir = mkdtempSync(join(tmpdir(), 'brand-products-'))
  const guides_dir = mkdtempSync(join(tmpdir(), 'brand-guides-'))
  const links_dir = mkdtempSync(join(tmpdir(), 'brand-links-'))
  const taxonomies_dir = mkdtempSync(join(tmpdir(), 'brand-taxonomies-'))

  writeAll(products_dir, content.products)
  writeAll(guides_dir, content.guides)
  writeAll(links_dir, content.links)
  writeBrands(taxonomies_dir, content.brand_ids ?? [])

  return { products_dir, guides_dir, links_dir, taxonomies_dir }
}

function writeAll(dir: string, files: Record<string, object> = {}) {
  for (const [file_name, payload] of Object.entries(files)) {
    writeFileSync(join(dir, file_name), JSON.stringify(payload))
  }
}

function writeBrands(dir: string, brand_ids: string[]) {
  const items = brand_ids.map((id, index) => ({
    id,
    label: id,
    description: '',
    aliases: [],
    nav_visible: true,
    sort_order: (index + 1) * 10,
  }))

  writeFileSync(join(dir, 'brands.json'), JSON.stringify({ items }))
}

function cleanup(dirs: Dirs) {
  for (const dir of Object.values(dirs)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('buildBrandRoutes', () => {
  it('should build a /brand/:id route for every brand referenced by a published item via tag_ids', () => {
    const dirs = makeContentDirs({
      products: { 'a.json': { status: 'published', category_id: 'home', tag_ids: ['panasonic', 'typing'], offers: [] } },
      guides: { 'g.json': { status: 'published', category_ids: ['home'], tag_ids: ['sony'] } },
      brand_ids: ['panasonic', 'sony', 'unused-brand'],
    })

    try {
      expect(buildBrandRoutes(dirs).toSorted()).toEqual(['/brand/panasonic', '/brand/sony'])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should never emit a brand route for a non-brand tag id', () => {
    const dirs = makeContentDirs({
      products: { 'a.json': { status: 'published', category_id: 'home', tag_ids: ['typing'], offers: [] } },
      brand_ids: ['panasonic'],
    })

    try {
      expect(buildBrandRoutes(dirs)).toEqual([])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should keep brand ids out of /tag routes (single canonical, ADR-8)', () => {
    const dirs = makeContentDirs({
      products: { 'a.json': { status: 'published', category_id: 'home', tag_ids: ['panasonic', 'typing'], offers: [] } },
      brand_ids: ['panasonic'],
    })

    try {
      const tag_routes = buildTagRoutes(dirs)

      expect(tag_routes).toEqual(['/tag/typing'])
      expect(tag_routes).not.toContain('/tag/panasonic')
      expect(buildBrandRoutes(dirs)).toEqual(['/brand/panasonic'])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should exclude brands whose only associated items are not published', () => {
    const dirs = makeContentDirs({
      products: {
        'live.json': { status: 'published', category_id: 'home', tag_ids: ['panasonic'], offers: [] },
        'draft.json': { status: 'draft', category_id: 'home', tag_ids: ['sony'], offers: [] },
      },
      brand_ids: ['panasonic', 'sony'],
    })

    try {
      expect(buildBrandRoutes(dirs)).toEqual(['/brand/panasonic'])
    }
    finally {
      cleanup(dirs)
    }
  })
})
