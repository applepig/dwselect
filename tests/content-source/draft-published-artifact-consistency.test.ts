import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { collectNonEmptyTaxonomyIds } from '../../app/utils/published-products/non-empty-taxonomy-ids'
import { buildSearchIndexPayload } from '../../app/utils/search/search-index'
import { buildGuideRoutes } from '../../scripts/build-guide-routes'
import { buildProductRoutes } from '../../scripts/build-product-routes'
import { buildPublicDiscoveryFilesFromSource } from '../../scripts/build-public-discovery'
import { readPublicContentSource, type PublicContentSource } from '../../scripts/content-source/read-public-content-source'
import { buildPublicContentPayload } from '../../scripts/public-content'

// AC1：draft 一律缺席，且同一 fixture 經不同 artifact builder 產出的「適用集合」id 完全一致。
// 依內容類型分列（links 無 detail route，不能要求與 products/guides 齊一）：
// - products／guides：prerender routes、public payload、search index、sitemap、RSS 五處 id 集合一致。
// - links：public payload、search index、RSS 三處一致（不進 prerender routes 與 sitemap detail URL）。
// - taxonomy sitemap 收錄集合＝non-empty taxonomy id 集合（route builder 與 sitemap 共用 collectNonEmptyTaxonomyIds）。

type ContentSpec = { id: string, status: 'published' | 'draft', title: string }

const PRODUCTS: ContentSpec[] = [
  { id: 'prod-alpha', status: 'published', title: '商品 Alpha' },
  { id: 'prod-bravo', status: 'published', title: '商品 Bravo' },
  { id: 'prod-draft', status: 'draft', title: '商品 Draft' },
]

const GUIDES: ContentSpec[] = [
  { id: 'guide-alpha', status: 'published', title: '指南 Alpha' },
  { id: 'guide-bravo', status: 'published', title: '指南 Bravo' },
  { id: 'guide-draft', status: 'draft', title: '指南 Draft' },
]

const LINKS: ContentSpec[] = [
  { id: 'link-alpha', status: 'published', title: '連結 Alpha' },
  { id: 'link-bravo', status: 'published', title: '連結 Bravo' },
  { id: 'link-draft', status: 'draft', title: '連結 Draft' },
]

const published_ids = (specs: ContentSpec[]) => new Set(specs.filter((spec) => spec.status === 'published').map((spec) => spec.id))
const EXPECTED_PRODUCT_IDS = published_ids(PRODUCTS)
const EXPECTED_GUIDE_IDS = published_ids(GUIDES)
const EXPECTED_LINK_IDS = published_ids(LINKS)

const temp_roots: string[] = []

afterEach(() => {
  for (const root of temp_roots) {
    rmSync(root, { recursive: true, force: true })
  }

  temp_roots.length = 0
})

function makeProductJson(spec: ContentSpec) {
  return JSON.stringify({
    slug: spec.id,
    status: spec.status,
    name: spec.title,
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
    tag_ids: ['tag-a'],
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  })
}

function makeGuideJson(spec: ContentSpec) {
  return JSON.stringify({
    slug: spec.id,
    status: spec.status,
    title: spec.title,
    summary: '指南摘要',
    source_url: `https://example.com/${spec.id}`,
    image_url: null,
    category_ids: ['other'],
    tag_ids: ['tag-a'],
    related_product_ids: [],
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  })
}

function makeLinkJson(spec: ContentSpec) {
  return JSON.stringify({
    slug: spec.id,
    status: spec.status,
    title: spec.title,
    summary: '連結摘要',
    url: `https://example.com/${spec.id}`,
    image_url: null,
    icon: 'i-lucide-link',
    category_ids: ['other'],
    tag_ids: ['tag-a'],
    sort_order: 10,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  })
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'dwselect-ac1-fixture-'))
  temp_roots.push(root)
  const products_dir = join(root, 'content', 'products')
  const guides_dir = join(root, 'content', 'guides')
  const links_dir = join(root, 'content', 'links')
  const taxonomies_dir = join(root, 'content', 'taxonomies')
  const public_dir = join(root, 'public')

  for (const dir of [products_dir, guides_dir, links_dir, taxonomies_dir, public_dir]) {
    mkdirSync(dir, { recursive: true })
  }

  for (const spec of PRODUCTS) {
    writeFileSync(join(products_dir, `${spec.id}.json`), makeProductJson(spec))
  }

  for (const spec of GUIDES) {
    writeFileSync(join(guides_dir, `${spec.id}.json`), makeGuideJson(spec))
  }

  for (const spec of LINKS) {
    writeFileSync(join(links_dir, `${spec.id}.json`), makeLinkJson(spec))
  }

  writeFileSync(join(taxonomies_dir, 'categories.json'), JSON.stringify({
    items: [{ id: 'other', label: '其他', short_label: '其他', nav_visible: true, sort_order: 10 }],
  }))
  writeFileSync(join(taxonomies_dir, 'channels.json'), JSON.stringify({
    items: [{ id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 10 }],
  }))
  writeFileSync(join(taxonomies_dir, 'tags.json'), JSON.stringify({
    items: [{ id: 'tag-a', label: '標籤 A', description: '測試標籤', aliases: [], nav_visible: true, sort_order: 10 }],
  }))
  writeFileSync(join(taxonomies_dir, 'brands.json'), JSON.stringify({ items: [] }))

  return { root, products_dir, guides_dir, links_dir, taxonomies_dir, public_dir }
}

function readerOptions(fixture: ReturnType<typeof makeFixture>) {
  return {
    products_dir: fixture.products_dir,
    guides_dir: fixture.guides_dir,
    links_dir: fixture.links_dir,
    taxonomies_dir: fixture.taxonomies_dir,
  }
}

// 從 route 字串（/products/{id}、/guide/{id}）抽 id 集合。
function routeStems(routes: string[], prefix: string): Set<string> {
  return new Set(routes.map((route) => route.slice(prefix.length)))
}

// 從 sitemap.xml 的 <loc> 抽指定 detail path 前綴下的 id 集合（loc 為完整 URL）。
function sitemapDetailIds(xml: string, segment: string): Set<string> {
  const ids = new Set<string>()
  const pattern = new RegExp(`<loc>[^<]*/${segment}/([^<]+)</loc>`, 'g')

  for (const match of xml.matchAll(pattern)) {
    ids.add(decodeURIComponent(match[1]))
  }

  return ids
}

// RSS item 的 <title> 集合（排除 channel 標題，即第一個 <title>）。
function rssItemTitles(xml: string): string[] {
  const titles = [...xml.matchAll(/<title>([^<]*)<\/title>/g)].map((match) => match[1])

  return titles.slice(1)
}

function idsFromTitles(titles: string[], specs: ContentSpec[]): Set<string> {
  const title_to_id = new Map(specs.map((spec) => [spec.title, spec.id]))

  return new Set(
    titles
      .map((title) => title_to_id.get(title))
      .filter((id): id is string => id !== undefined),
  )
}

describe('draft/published artifact set consistency (AC1)', () => {
  async function buildArtifacts(fixture: ReturnType<typeof makeFixture>) {
    const source: PublicContentSource = await readPublicContentSource(readerOptions(fixture))
    const payload = buildPublicContentPayload(source)
    const search = buildSearchIndexPayload(
      { products: source.products, guides: source.guides, links: source.links },
      source.taxonomies,
    )
    await buildPublicDiscoveryFilesFromSource(source, { public_dir: fixture.public_dir })
    const sitemap = readFileSync(join(fixture.public_dir, 'sitemap.xml'), 'utf8')
    const rss = readFileSync(join(fixture.public_dir, 'rss.xml'), 'utf8')

    return { source, payload, search, sitemap, rss }
  }

  const searchIds = (documents: { type: string, content_id: string }[], type: string) =>
    new Set(documents.filter((document) => document.type === type).map((document) => document.content_id))

  it('collects an identical product id set across prerender routes, payload, search index, sitemap and RSS, excluding drafts', async () => {
    const fixture = makeFixture()
    const { payload, search, sitemap, rss } = await buildArtifacts(fixture)

    const prerender = routeStems(buildProductRoutes(fixture.products_dir), '/products/')
    const payload_ids = new Set(payload.products.cards.map((card) => card.id))
    const search_ids = searchIds(search.documents, 'product')
    const sitemap_ids = sitemapDetailIds(sitemap, 'products')
    const rss_ids = idsFromTitles(rssItemTitles(rss), PRODUCTS)

    expect(prerender).toEqual(EXPECTED_PRODUCT_IDS)
    expect(payload_ids).toEqual(EXPECTED_PRODUCT_IDS)
    expect(search_ids).toEqual(EXPECTED_PRODUCT_IDS)
    expect(sitemap_ids).toEqual(EXPECTED_PRODUCT_IDS)
    expect(rss_ids).toEqual(EXPECTED_PRODUCT_IDS)
    expect(prerender.has('prod-draft')).toBe(false)
  })

  it('collects an identical guide id set across prerender routes, payload, search index, sitemap and RSS, excluding drafts', async () => {
    const fixture = makeFixture()
    const { payload, search, sitemap, rss } = await buildArtifacts(fixture)

    const prerender = routeStems(buildGuideRoutes(fixture.guides_dir), '/guide/')
    const payload_ids = new Set(payload.guides.rows.map((row) => row.id))
    const search_ids = searchIds(search.documents, 'guide')
    const sitemap_ids = sitemapDetailIds(sitemap, 'guide')
    const rss_ids = idsFromTitles(rssItemTitles(rss), GUIDES)

    expect(prerender).toEqual(EXPECTED_GUIDE_IDS)
    expect(payload_ids).toEqual(EXPECTED_GUIDE_IDS)
    expect(search_ids).toEqual(EXPECTED_GUIDE_IDS)
    expect(sitemap_ids).toEqual(EXPECTED_GUIDE_IDS)
    expect(rss_ids).toEqual(EXPECTED_GUIDE_IDS)
    expect(prerender.has('guide-draft')).toBe(false)
  })

  it('collects an identical link id set across payload, search index and RSS, and keeps links out of prerender routes and sitemap detail URLs', async () => {
    const fixture = makeFixture()
    const { payload, search, sitemap, rss } = await buildArtifacts(fixture)

    const payload_ids = new Set(payload.links.map((row) => row.id))
    const search_ids = searchIds(search.documents, 'link')
    const rss_ids = idsFromTitles(rssItemTitles(rss), LINKS)

    expect(payload_ids).toEqual(EXPECTED_LINK_IDS)
    expect(search_ids).toEqual(EXPECTED_LINK_IDS)
    expect(rss_ids).toEqual(EXPECTED_LINK_IDS)
    // links 不進 prerender routes（無 detail 頁），也不在 sitemap detail URL 出現。
    expect(sitemapDetailIds(sitemap, 'links')).toEqual(new Set())
    expect(sitemap).not.toContain('link-alpha')
  })

  it('lists taxonomy sitemap entries that match the non-empty taxonomy id set from published content only', async () => {
    const fixture = makeFixture()
    const { source, sitemap } = await buildArtifacts(fixture)

    const published = {
      products: source.products.filter((product) => product.status === 'published').map((product) => ({
        category_id: product.category_id,
        tag_ids: product.tag_ids,
        channel_ids: product.offers.map((offer) => offer.channel_id),
      })),
      guides: source.guides.filter((guide) => guide.status === 'published').map((guide) => ({
        category_ids: guide.category_ids,
        tag_ids: guide.tag_ids,
      })),
      links: source.links.filter((link) => link.status === 'published').map((link) => ({
        category_ids: link.category_ids,
        tag_ids: link.tag_ids,
      })),
    }
    const non_empty = collectNonEmptyTaxonomyIds(published, { brand_ids: new Set() })

    expect(sitemapDetailIds(sitemap, 'category')).toEqual(non_empty.category_ids)
    expect(sitemapDetailIds(sitemap, 'tag')).toEqual(non_empty.tag_ids)
    expect(sitemapDetailIds(sitemap, 'channel')).toEqual(non_empty.channel_ids)
    // 本 fixture 的非空 taxonomy 確為 published 內容引用者。
    expect(non_empty.category_ids).toEqual(new Set(['other']))
    expect(non_empty.tag_ids).toEqual(new Set(['tag-a']))
    expect(non_empty.channel_ids).toEqual(new Set(['other']))
  })
})
