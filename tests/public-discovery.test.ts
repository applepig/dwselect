import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'

import type { CategoryDefinition, ChannelDefinition, Guide, LinkDefinition, Product, TagDefinition } from '../app/utils/product-schema'
import { buildPublicContentPayload } from '../scripts/public-content'
import { buildPublicDiscoveryFiles } from '../scripts/build-public-discovery'

const execFileAsync = promisify(execFile)

const base_product: Product = {
  id: '2026-06-02-sample-product',
  status: 'published',
  name: '機械鍵盤 & <滑鼠>',
  english_name: 'Mechanical Keyboard',
  summary: '熱插拔 & 小尺寸鍵盤',
  long_description: '適合長時間寫程式的繁中鍵盤',
  llm_description: 'Alice layout with gasket mount',
  search_aliases: ['客製化鍵盤'],
  model_numbers: ['MK-01'],
  offers: [
    {
      channel_id: 'pchome',
      url: 'https://example.com/product?a=1&b=2',
      price_text: 'NT$ 1,990',
      price: {
        amount: 1990,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      checked_at: '2026-06-02T00:00:00+08:00',
    },
  ],
  image_file: '2026-06-02-sample-product.jpg',
  image_url: null,
  category_id: 'computer-3c',
  tag_ids: ['keyboard', 'fixture-brand'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-03T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const base_guide: Guide = {
  id: '2026-06-03-guide',
  status: 'published',
  title: '日本米入門篇',
  summary: '如何挑選日本米',
  source_url: 'https://example.com/guide?from=dw&lang=zh',
  image_url: null,
  category_ids: ['household'],
  tag_ids: ['food'],
  related_product_ids: [],
  created_at: '2026-06-03T00:00:00+08:00',
  updated_at: '2026-06-03T00:00:00+08:00',
  published_at: '2026-06-03T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const base_link: LinkDefinition = {
  id: 'applepig-home',
  status: 'published',
  title: 'applepig.idv.tw',
  summary: 'DW 的主站入口',
  url: 'https://applepig.idv.tw/?a=1&b=2',
  icon: 'i-lucide-link',
  category_ids: ['other'],
  tag_ids: [],
  sort_order: 10,
  created_at: '2026-06-01T00:00:00+08:00',
  updated_at: '2026-06-01T00:00:00+08:00',
  published_at: '2026-06-01T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const test_categories: CategoryDefinition[] = [
  { id: 'other', label: '其他', short_label: '其他', nav_visible: true, sort_order: 999 },
  { id: 'computer-3c', label: '電腦3C', short_label: '電腦3C', nav_visible: true, sort_order: 10 },
  { id: 'household', label: '生活百貨', short_label: '生活百貨', nav_visible: true, sort_order: 60 },
]

const test_channels: ChannelDefinition[] = [
  { id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 999 },
  { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
]

const test_tags: TagDefinition[] = [
  { id: 'food', label: '食材', description: '食材', aliases: [], nav_visible: true, sort_order: 20 },
  { id: 'keyboard', label: '鍵盤', description: '鍵盤', aliases: ['打字'], nav_visible: true, sort_order: 10 },
]

const test_brands: TagDefinition[] = [
  { id: 'fixture-brand', label: 'Fixture Brand', description: 'Fixture Brand', aliases: ['測試牌'], nav_visible: true, sort_order: 10 },
]

const temp_paths: string[] = []

afterEach(async () => {
  await Promise.all(temp_paths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('public content payload', () => {
  it('should expose only published content with full taxonomy definitions and stable sorting', () => {
    const payload = buildPublicContentPayload({
      products: [
        { ...base_product, id: 'z-product', name: 'Z Product' },
        { ...base_product, id: 'draft-product', status: 'draft', name: '草稿商品' },
        { ...base_product, id: 'a-product', name: 'A Product' },
      ],
      guides: [
        { ...base_guide, id: 'draft-guide', status: 'draft', title: '草稿指南' },
        base_guide,
      ],
      links: [
        { ...base_link, id: 'archived-link', status: 'archived', title: '封存連結' },
        base_link,
      ],
      taxonomies: {
        categories: test_categories,
        channels: test_channels,
        tags: test_tags,
        brands: test_brands,
      },
    })

    expect(payload).toMatchObject({
      version: 1,
      site: {
        name: 'DW嚴選',
        url: 'https://dwselect.applepig.net/',
      },
    })
    expect(payload.products.cards.map((card) => card.id)).toEqual(['a-product', 'z-product'])
    expect(Object.keys(payload.products.details_by_id)).toEqual(['a-product', 'z-product'])
    expect(payload.guides.map((guide) => guide.id)).toEqual(['2026-06-03-guide'])
    expect(payload.links.map((link) => link.id)).toEqual(['applepig-home'])
    expect(JSON.stringify(payload)).not.toContain('草稿')
    expect(JSON.stringify(payload)).not.toContain('封存')
    expect(payload.taxonomies.categories.map((category) => category.id)).toEqual(['computer-3c', 'household', 'other'])
    expect(payload.taxonomies.channels.map((channel) => channel.id)).toEqual(['pchome', 'other'])
    expect(payload.taxonomies.tags.map((tag) => tag.id)).toEqual(['keyboard', 'food'])
    expect(payload.taxonomies.brands.map((brand) => brand.id)).toEqual(['fixture-brand'])
    expect(payload.products.cards[0]).not.toHaveProperty('category')
    expect(payload.products.cards[0]).not.toHaveProperty('description')
    expect(payload.products.cards[0]).not.toHaveProperty('tags')
    expect(payload.products.cards[0]).not.toHaveProperty('purchase_link')
  })
})

describe('frontend-ready public content payload shape', () => {
  function buildSamplePayload() {
    return buildPublicContentPayload({
      products: [
        base_product,
        {
          ...base_product,
          id: 'related-product',
          name: '相關商品',
          summary: '相關短評',
          long_description: '相關長描述',
          llm_description: '',
          image_file: 'related-product.jpg',
          tag_ids: ['keyboard'],
        },
      ],
      guides: [base_guide],
      links: [base_link],
      taxonomies: {
        categories: test_categories,
        channels: test_channels,
        tags: test_tags,
        brands: test_brands,
      },
    })
  }

  it('should map product cards to semantic fields without buy url or long description', () => {
    const payload = buildSamplePayload()
    const card = payload.products.cards.find((item) => item.id === '2026-06-02-sample-product')!

    expect(card).toEqual({
      id: '2026-06-02-sample-product',
      name: '機械鍵盤 & <滑鼠>',
      summary: '熱插拔 & 小尺寸鍵盤',
      image_url: '/images/products/2026-06-02-sample-product.webp',
      category_id: 'computer-3c',
      category_label: '電腦3C',
      channel_id: 'pchome',
      channel_label: 'PChome',
      price_label: 'NT$ 1,990',
      tag_labels: ['鍵盤', 'Fixture Brand'],
      published_at: '2026-06-02T00:00:00+08:00',
    })
    expect(card).not.toHaveProperty('long_description')
    expect(card).not.toHaveProperty('llm_description')
    expect(card).not.toHaveProperty('buy_url')
    expect(card).not.toHaveProperty('dw_says')
  })

  it('should map product detail to content semantics without dw_says or generic description', () => {
    const payload = buildSamplePayload()
    const detail = payload.products.details_by_id['2026-06-02-sample-product']!

    expect(detail).toMatchObject({
      id: '2026-06-02-sample-product',
      name: '機械鍵盤 & <滑鼠>',
      summary: '熱插拔 & 小尺寸鍵盤',
      long_description: '適合長時間寫程式的繁中鍵盤',
      llm_description: 'Alice layout with gasket mount',
      hero_image_url: '/images/products/2026-06-02-sample-product.webp',
      hero_alt: '機械鍵盤 & <滑鼠>',
      category_id: 'computer-3c',
      category_label: '電腦3C',
      channel_id: 'pchome',
      channel_label: 'PChome',
      tag_labels: ['鍵盤', 'Fixture Brand'],
      price_label: 'NT$ 1,990',
      buy_url: 'https://example.com/product?a=1&b=2',
      fine_print: '價格與庫存以通路頁面為準。',
    })
    expect(detail).not.toHaveProperty('dw_says')
    expect(detail).not.toHaveProperty('description')
    expect(detail).not.toHaveProperty('title')
    expect(detail).not.toHaveProperty('hero_image')
    expect(detail).not.toHaveProperty('buy_cta')
  })

  it('should expose related product cards with only related semantic keys and no placeholders', () => {
    const payload = buildSamplePayload()
    const detail = payload.products.details_by_id['2026-06-02-sample-product']!

    expect(detail.related_products).toEqual([
      {
        id: 'related-product',
        name: '相關商品',
        image_url: '/images/products/related-product.webp',
        category_label: '電腦3C',
        channel_label: 'PChome',
      },
    ])

    for (const related of detail.related_products) {
      expect(Object.keys(related).toSorted()).toEqual(['category_label', 'channel_label', 'id', 'image_url', 'name'])
      expect(related).not.toHaveProperty('description')
      expect(related).not.toHaveProperty('purchase_link')
    }
  })

  it('should expose navigation counts, category chips and downstreamed popular search tags', () => {
    const payload = buildSamplePayload()

    expect(payload.navigation.counts.products).toBe(2)
    expect(payload.navigation.category_chips).toEqual([
      { id: 'all', label: '全部', count: 2 },
      { id: 'computer-3c', label: '電腦3C', count: 2 },
    ])
    expect(payload.navigation.desktop_category_items).toEqual(payload.navigation.category_chips)
    expect(payload.navigation).toHaveProperty('popular_search_tags')
    expect(payload.navigation.popular_search_tags).toHaveProperty('tags')
    expect(payload.navigation.popular_search_tags).toHaveProperty('brands')
  })

  it('should not serialize dw_says or generic product description in the products payload', () => {
    const serialized = JSON.stringify(buildSamplePayload().products)

    expect(serialized).not.toContain('dw_says')
    expect(serialized).not.toContain('"description"')
    expect(serialized).not.toContain('buy_cta')
    expect(serialized).not.toContain('hero_image"')
    expect(serialized).not.toContain('"title"')
    expect(serialized).not.toContain('purchase_link')
  })
})

describe('public discovery files', () => {
  it('should build robots, llms, sitemap, RSS and JSON API files from content directories', async () => {
    const temp_dir = await makeFixtureProject()
    const output_dir = join(temp_dir, 'public')

    const summary = await buildPublicDiscoveryFiles({
      products_dir: join(temp_dir, 'content', 'products'),
      guides_dir: join(temp_dir, 'content', 'guides'),
      links_dir: join(temp_dir, 'content', 'links'),
      taxonomies_dir: join(temp_dir, 'content', 'taxonomies'),
      public_dir: output_dir,
    })

    const robots = await readFile(join(output_dir, 'robots.txt'), 'utf8')
    const llms = await readFile(join(output_dir, 'llms.txt'), 'utf8')
    const sitemap = await readFile(join(output_dir, 'sitemap.xml'), 'utf8')
    const rss = await readFile(join(output_dir, 'rss.xml'), 'utf8')
    const api = JSON.parse(await readFile(join(output_dir, 'api', 'content.json'), 'utf8')) as ReturnType<typeof buildPublicContentPayload>

    expect(summary).toEqual({
      output_paths: [
        join(output_dir, 'robots.txt'),
        join(output_dir, 'llms.txt'),
        join(output_dir, 'sitemap.xml'),
        join(output_dir, 'rss.xml'),
        join(output_dir, 'api', 'content.json'),
      ],
      product_count: 2,
      guide_count: 1,
      link_count: 1,
    })
    expect(robots).toBe('User-agent: *\nAllow: /\n\nSitemap: https://dwselect.applepig.net/sitemap.xml\n')
    expect(llms).toContain('# DW嚴選')
    expect(llms).toContain('https://dwselect.applepig.net/api/content.json')
    expect(llms).toContain('Do not attempt write actions')
    expect(llms).not.toContain('dwselect.toybox.local')
    expect(sitemap).toContain('<loc>https://dwselect.applepig.net/</loc>')
    expect(sitemap).toContain('<loc>https://dwselect.applepig.net/guide</loc>')
    expect(sitemap).toContain('<loc>https://dwselect.applepig.net/search</loc>')
    expect(sitemap).toContain('<loc>https://dwselect.applepig.net/links</loc>')
    expect(sitemap).toContain('<loc>https://dwselect.applepig.net/products/2026-06-02-sample-product</loc>')
    expect(sitemap).toContain('<loc>https://dwselect.applepig.net/products/no-published-at-product</loc>')
    expect(sitemap).toContain('<lastmod>2026-06-03</lastmod>')
    expect(sitemap).not.toContain('draft-product')
    expect(sitemap).not.toContain('dwselect.toybox.local')
    expect(rss.indexOf('<title>日本米入門篇</title>')).toBeLessThan(rss.indexOf('<title>機械鍵盤 &amp; &lt;滑鼠&gt;</title>'))
    expect(rss.indexOf('<title>機械鍵盤 &amp; &lt;滑鼠&gt;</title>')).toBeLessThan(rss.indexOf('<title>applepig.idv.tw</title>'))
    expect(rss.indexOf('<title>applepig.idv.tw</title>')).toBeLessThan(rss.indexOf('<title>No Published At</title>'))
    expect(rss).toContain('<description>熱插拔 &amp; 小尺寸鍵盤</description>')
    expect(rss).toContain('<link>https://applepig.idv.tw/?a=1&amp;b=2</link>')
    expect(rss).toContain('<pubDate>Tue, 02 Jun 2026 00:00:00 +0800</pubDate>')
    expect(rss).not.toContain('draft-product')
    expect(api.products.cards.map((card) => card.id)).toEqual(['2026-06-02-sample-product', 'no-published-at-product'])
    expect(api.guides.map((guide) => guide.id)).toEqual(['2026-06-03-guide'])
    expect(api.links.map((link) => link.id)).toEqual(['applepig-home'])
  })

  it('should return empty arrays when content directories are missing', async () => {
    const temp_dir = await mkdtemp(join(tmpdir(), 'dwselect-public-discovery-empty-'))
    temp_paths.push(temp_dir)
    const taxonomies_dir = join(temp_dir, 'taxonomies')
    await mkdir(taxonomies_dir)
    await writeTaxonomies(taxonomies_dir)

    const summary = await buildPublicDiscoveryFiles({
      products_dir: join(temp_dir, 'missing-products'),
      guides_dir: join(temp_dir, 'missing-guides'),
      links_dir: join(temp_dir, 'missing-links'),
      taxonomies_dir,
      public_dir: join(temp_dir, 'public'),
    })
    const api = JSON.parse(await readFile(join(temp_dir, 'public', 'api', 'content.json'), 'utf8')) as ReturnType<typeof buildPublicContentPayload>
    const sitemap = await readFile(join(temp_dir, 'public', 'sitemap.xml'), 'utf8')
    const rss = await readFile(join(temp_dir, 'public', 'rss.xml'), 'utf8')

    expect(summary.product_count).toBe(0)
    expect(summary.guide_count).toBe(0)
    expect(summary.link_count).toBe(0)
    expect(api.products.cards).toEqual([])
    expect(api.products.details_by_id).toEqual({})
    expect(api.guides).toEqual([])
    expect(api.links).toEqual([])
    expect(api.taxonomies.categories).toHaveLength(test_categories.length)
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(rss).toContain('<channel>')
  })

  it('should run the discovery build script directly with Node ESM', async () => {
    const temp_dir = await makeFixtureProject()
    const output_dir = join(temp_dir, 'cli-public')

    const { stdout } = await execFileAsync(process.execPath, [
      'scripts/build-public-discovery.ts',
      '--products-dir',
      join(temp_dir, 'content', 'products'),
      '--guides-dir',
      join(temp_dir, 'content', 'guides'),
      '--links-dir',
      join(temp_dir, 'content', 'links'),
      '--taxonomies-dir',
      join(temp_dir, 'content', 'taxonomies'),
      '--public-dir',
      output_dir,
    ])

    expect(stdout).toContain(`Public discovery files written: ${output_dir}`)
    expect(existsSync(join(output_dir, 'robots.txt'))).toBe(true)
    expect(existsSync(join(output_dir, 'llms.txt'))).toBe(true)
    expect(existsSync(join(output_dir, 'sitemap.xml'))).toBe(true)
    expect(existsSync(join(output_dir, 'rss.xml'))).toBe(true)
    expect(existsSync(join(output_dir, 'api', 'content.json'))).toBe(true)
  })

  it('should run the combined public artifacts build script from a single content source read', async () => {
    const temp_dir = await makeFixtureProject()
    const output_dir = join(temp_dir, 'combined-public')

    const { stdout } = await execFileAsync(process.execPath, [
      'scripts/build-public-artifacts.ts',
      '--products-dir',
      join(temp_dir, 'content', 'products'),
      '--guides-dir',
      join(temp_dir, 'content', 'guides'),
      '--links-dir',
      join(temp_dir, 'content', 'links'),
      '--taxonomies-dir',
      join(temp_dir, 'content', 'taxonomies'),
      '--public-dir',
      output_dir,
    ])

    expect(stdout).toContain(`Public artifacts written: ${output_dir}`)
    expect(existsSync(join(output_dir, 'search-index.json'))).toBe(true)
    expect(existsSync(join(output_dir, 'api', 'content.json'))).toBe(true)
    expect(existsSync(join(output_dir, 'sitemap.xml'))).toBe(true)
  })

  it('should wire build and generate scripts to build content images and search index before discovery artifacts', async () => {
    const package_source = await readFile(new URL('../package.json', import.meta.url), 'utf8')
    const package_json = JSON.parse(package_source) as { scripts: Record<string, string> }
    const artifacts_source = await readFile(new URL('../scripts/build-public-artifacts.ts', import.meta.url), 'utf8')

    expect(package_json.scripts['build:public-discovery']).toBe('node scripts/build-public-discovery.ts')
    expect(package_json.scripts['build:search-index']).toBe('node scripts/build-search-index.ts')
    expect(package_json.scripts['build:public-artifacts']).toBe('node scripts/build-public-artifacts.ts')
    expect(package_json.scripts.build).toBe('pnpm build:content-images && pnpm build:public-artifacts && nuxt build')
    expect(package_json.scripts.generate).toBe('pnpm build:content-images && pnpm build:public-artifacts && nuxt generate')
    expect(artifacts_source.match(/await readPublicContentSource\(/g)).toHaveLength(1)
    expect(artifacts_source).toContain('buildSearchIndexFileFromSource(source')
    expect(artifacts_source).toContain('buildPublicDiscoveryFilesFromSource(source')
  })
})

async function makeFixtureProject() {
  const temp_dir = await mkdtemp(join(tmpdir(), 'dwselect-public-discovery-'))
  temp_paths.push(temp_dir)
  const products_dir = join(temp_dir, 'content', 'products')
  const product_images_dir = join(products_dir, 'images')
  const guides_dir = join(temp_dir, 'content', 'guides')
  const links_dir = join(temp_dir, 'content', 'links')
  const taxonomies_dir = join(temp_dir, 'content', 'taxonomies')
  await mkdir(product_images_dir, { recursive: true })
  await mkdir(guides_dir, { recursive: true })
  await mkdir(links_dir, { recursive: true })
  await mkdir(taxonomies_dir, { recursive: true })
  await writeFile(join(products_dir, '2026-06-02-sample-product.json'), JSON.stringify(base_product))
  await writeFile(join(products_dir, 'draft-product.json'), JSON.stringify({ ...base_product, id: 'draft-product', status: 'draft', name: '草稿商品' }))
  await writeFile(join(products_dir, 'no-published-at-product.json'), JSON.stringify({
    ...base_product,
    id: 'no-published-at-product',
    name: 'No Published At',
    image_file: 'no-published-at-product.jpg',
    published_at: null,
    updated_at: '2026-06-04T00:00:00+08:00',
  }))
  await writeFile(join(product_images_dir, '2026-06-02-sample-product.jpg'), createTinySvg())
  await writeFile(join(product_images_dir, 'no-published-at-product.jpg'), createTinySvg())
  await writeFile(join(guides_dir, '2026-06-03-guide.json'), JSON.stringify(base_guide))
  await writeFile(join(links_dir, 'applepig-home.json'), JSON.stringify(base_link))
  await writeTaxonomies(taxonomies_dir)

  return temp_dir
}

function createTinySvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#fff"/></svg>'
}

async function writeTaxonomies(taxonomies_dir: string) {
  await writeFile(join(taxonomies_dir, 'categories.json'), JSON.stringify({ items: test_categories }))
  await writeFile(join(taxonomies_dir, 'channels.json'), JSON.stringify({ items: test_channels }))
  await writeFile(join(taxonomies_dir, 'tags.json'), JSON.stringify({ items: test_tags }))
  await writeFile(join(taxonomies_dir, 'brands.json'), JSON.stringify({ items: test_brands }))
}
