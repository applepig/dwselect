import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildTagRoutes } from '../scripts/build-tag-routes'

type Dirs = { products_dir: string, guides_dir: string, links_dir: string }

function makeContentDirs(content: {
  products?: Record<string, object>
  guides?: Record<string, object>
  links?: Record<string, object>
}): Dirs {
  const products_dir = mkdtempSync(join(tmpdir(), 'tag-products-'))
  const guides_dir = mkdtempSync(join(tmpdir(), 'tag-guides-'))
  const links_dir = mkdtempSync(join(tmpdir(), 'tag-links-'))

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

describe('buildTagRoutes', () => {
  it('should build a /tag/:id route for every tag referenced by a published item across all three types', () => {
    const dirs = makeContentDirs({
      products: { 'a.json': { status: 'published', category_id: 'computer', tag_ids: ['typing'] } },
      guides: { 'g.json': { status: 'published', category_ids: ['home'], tag_ids: ['food'] } },
      links: { 'l.json': { status: 'published', category_ids: ['other'], tag_ids: ['link-tag'] } },
    })

    try {
      expect(buildTagRoutes(dirs).toSorted()).toEqual([
        '/tag/food',
        '/tag/link-tag',
        '/tag/typing',
      ])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should exclude tags whose only associated items are not published', () => {
    const dirs = makeContentDirs({
      products: {
        'live.json': { status: 'published', category_id: 'computer', tag_ids: ['typing'] },
        'draft.json': { status: 'draft', category_id: 'computer', tag_ids: ['draft-only-tag'] },
      },
    })

    try {
      const routes = buildTagRoutes(dirs)

      expect(routes).toEqual(['/tag/typing'])
      expect(routes).not.toContain('/tag/draft-only-tag')
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should not duplicate a tag route when several published items share the tag', () => {
    const dirs = makeContentDirs({
      products: {
        'a.json': { status: 'published', category_id: 'computer', tag_ids: ['typing'] },
        'b.json': { status: 'published', category_id: 'computer', tag_ids: ['typing'] },
      },
    })

    try {
      expect(buildTagRoutes(dirs)).toEqual(['/tag/typing'])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should return no routes when no published item carries a tag', () => {
    const dirs = makeContentDirs({
      products: { 'a.json': { status: 'published', category_id: 'computer', tag_ids: [] } },
    })

    try {
      expect(buildTagRoutes(dirs)).toEqual([])
    }
    finally {
      cleanup(dirs)
    }
  })
})
