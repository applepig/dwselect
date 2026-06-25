import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readPublicContentSource } from '../scripts/content-reader'
import { buildPublicContentPayload } from '../scripts/public-content'
import { buildSearchIndexPayload } from '../app/utils/search/search-index'

const content_route_url = new URL('../server/api/content.json.get.ts', import.meta.url)
const search_route_url = new URL('../server/routes/search-index.json.get.ts', import.meta.url)

const temp_roots: string[] = []

afterEach(() => {
  for (const root of temp_roots) {
    rmSync(root, { recursive: true, force: true })
  }

  temp_roots.length = 0
})

// id 由 reader 從檔名覆寫、slug 須為 ASCII kebab（AC1c）；name 保留任意字串（含 CJK），
// 供 Case 5 的「封存商品字串不外洩 payload」斷言。
function makeProductJson(overrides: { id_name: string, slug: string, status?: string } & Record<string, unknown>) {
  return {
    slug: overrides.slug,
    status: overrides.status ?? 'published',
    name: overrides.id_name,
    english_name: 'Sample Product',
    summary: '短評',
    long_description: '長描述',
    llm_description: '',
    search_aliases: [],
    model_numbers: [],
    offers: [
      {
        channel_id: 'other',
        url: 'https://example.com/product',
        price_text: 'NT$ 1,990',
        price: { amount: 1990, currency: 'TWD', unit: 'each', label: null },
        checked_at: '2026-06-02T00:00:00+08:00',
      },
    ],
    image_file: 'sample-product.jpg',
    image_url: null,
    category_id: 'other',
    tag_ids: [],
    reference_url: null,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  }
}

async function makeContentFixture() {
  const root = mkdtempSync(join(tmpdir(), 'dwselect-route-fixture-'))
  temp_roots.push(root)
  const products_dir = join(root, 'content', 'products')
  const guides_dir = join(root, 'content', 'guides')
  const links_dir = join(root, 'content', 'links')
  const taxonomies_dir = join(root, 'content', 'taxonomies')
  await mkdir(products_dir, { recursive: true })
  await mkdir(guides_dir, { recursive: true })
  await mkdir(links_dir, { recursive: true })
  await mkdir(taxonomies_dir, { recursive: true })

  for (const file_name of ['categories.json', 'channels.json', 'tags.json', 'brands.json']) {
    writeFileSync(join(taxonomies_dir, file_name), JSON.stringify({ items: [] }))
  }

  return { root, products_dir, guides_dir, links_dir, taxonomies_dir }
}

function readerOptions(fixture: Awaited<ReturnType<typeof makeContentFixture>>) {
  return {
    products_dir: fixture.products_dir,
    guides_dir: fixture.guides_dir,
    links_dir: fixture.links_dir,
    taxonomies_dir: fixture.taxonomies_dir,
  }
}

describe('public content server routes', () => {
  it('should expose /api/content.json from a Nuxt server route using the shared content reader and payload mapper', () => {
    expect(existsSync(content_route_url)).toBe(true)

    const route_source = readFileSync(content_route_url, 'utf8')

    expect(route_source).toContain('defineEventHandler')
    expect(route_source).toContain('readPublicContentSource')
    expect(route_source).toContain('buildPublicContentPayload')
  })

  it('should expose /search-index.json from a Nuxt server route using the shared content reader and search mapper', () => {
    expect(existsSync(search_route_url)).toBe(true)

    const route_source = readFileSync(search_route_url, 'utf8')

    expect(route_source).toContain('defineEventHandler')
    expect(route_source).toContain('readPublicContentSource')
    expect(route_source).toContain('buildSearchIndexPayload')
  })

  it('should build a published content payload from the Git-backed content source the route reads', async () => {
    const source = await readPublicContentSource()
    const payload = buildPublicContentPayload(source)

    expect(payload.version).toBe(1)
    expect(payload.products.cards.length).toBeGreaterThan(0)
    expect(Object.keys(payload.products.details_by_id)).toHaveLength(payload.products.cards.length)

    for (const card of payload.products.cards) {
      expect(card.image_url).toMatch(/^\/products\/images\//)
    }
  })

  it('should build a search index payload with Nuxt Image source paths from the same content source', async () => {
    const source = await readPublicContentSource()
    const payload = buildSearchIndexPayload(
      { products: source.products, guides: source.guides, links: source.links },
      source.taxonomies,
    )

    expect(payload.version).toBe(1)
    expect(payload.documents.length).toBeGreaterThan(0)

    const product_document = payload.documents.find((document) => document.type === 'product')

    expect(product_document?.image_url).toMatch(/^\/products\/images\//)
  })
})

describe('public content route data source boundary behaviour', () => {
  it('should reject (route would 500) when a content JSON file is invalid (spec Case 1)', async () => {
    const fixture = await makeContentFixture()
    writeFileSync(join(fixture.products_dir, 'broken-product.json'), '{ this is not valid json')

    await expect(readPublicContentSource(readerOptions(fixture))).rejects.toThrow()
  })

  it('should reflect newly added and archived products in the payload the route returns (spec Case 5)', async () => {
    const fixture = await makeContentFixture()
    writeFileSync(join(fixture.products_dir, 'published-product.json'), JSON.stringify(makeProductJson({ id_name: '已上架商品', slug: 'published-product' })))
    writeFileSync(join(fixture.products_dir, 'archived-product.json'), JSON.stringify(makeProductJson({ id_name: '已封存商品', slug: 'archived-product', status: 'archived' })))

    const payload = buildPublicContentPayload(await readPublicContentSource(readerOptions(fixture)))

    expect(payload.products.cards.map((card) => card.id)).toEqual(['published-product'])
    expect(JSON.stringify(payload)).not.toContain('已封存商品')
  })
})
