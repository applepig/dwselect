import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildChannelRoutes } from '../scripts/build-channel-routes'

type Dirs = { products_dir: string, guides_dir: string, links_dir: string }

function makeContentDirs(content: {
  products?: Record<string, object>
  guides?: Record<string, object>
  links?: Record<string, object>
}): Dirs {
  const products_dir = mkdtempSync(join(tmpdir(), 'channel-products-'))
  const guides_dir = mkdtempSync(join(tmpdir(), 'channel-guides-'))
  const links_dir = mkdtempSync(join(tmpdir(), 'channel-links-'))

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

describe('buildChannelRoutes', () => {
  it('should build a /channel/:id route for every channel referenced by a published product offer', () => {
    const dirs = makeContentDirs({
      products: {
        'a.json': {
          status: 'published',
          category_id: 'home',
          tag_ids: [],
          offers: [{ channel_id: 'pchome' }, { channel_id: 'momo' }],
        },
      },
    })

    try {
      expect(buildChannelRoutes(dirs).toSorted()).toEqual(['/channel/momo', '/channel/pchome'])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should not derive channel routes from guides or links (products-only, ADR-9)', () => {
    const dirs = makeContentDirs({
      products: {},
      guides: { 'g.json': { status: 'published', category_ids: ['home'], tag_ids: [] } },
      links: { 'l.json': { status: 'published', category_ids: ['home'], tag_ids: [] } },
    })

    try {
      expect(buildChannelRoutes(dirs)).toEqual([])
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should exclude channels whose only referencing product is not published', () => {
    const dirs = makeContentDirs({
      products: {
        'live.json': { status: 'published', category_id: 'home', tag_ids: [], offers: [{ channel_id: 'pchome' }] },
        'draft.json': { status: 'draft', category_id: 'home', tag_ids: [], offers: [{ channel_id: 'amazonjp' }] },
      },
    })

    try {
      const routes = buildChannelRoutes(dirs)

      expect(routes).toEqual(['/channel/pchome'])
      expect(routes).not.toContain('/channel/amazonjp')
    }
    finally {
      cleanup(dirs)
    }
  })

  it('should not duplicate a channel route when several products share the channel', () => {
    const dirs = makeContentDirs({
      products: {
        'a.json': { status: 'published', category_id: 'home', tag_ids: [], offers: [{ channel_id: 'pchome' }] },
        'b.json': { status: 'published', category_id: 'home', tag_ids: [], offers: [{ channel_id: 'pchome' }] },
      },
    })

    try {
      expect(buildChannelRoutes(dirs)).toEqual(['/channel/pchome'])
    }
    finally {
      cleanup(dirs)
    }
  })
})
