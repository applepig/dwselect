import MiniSearch from 'minisearch'
import { execFile } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, parse } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Guide, LinkDefinition, Product, TagDefinition } from '../app/utils/product-schema'
import { buildSearchIndexFile } from '../scripts/build-search-index'
import {
  SEARCH_INDEX_VERSION,
  buildSearchIndexPayload,
  getSearchOptions,
  getSearchDocuments,
  loadSearchIndex,
  querySearchIndex,
} from '../app/utils/search/search-index'

const base_product: Product = {
  id: '2026-06-02-sample-product',
  status: 'published',
  name: '機械鍵盤',
  price_text: 'NT$ 1,990',
  price: {
    amount: 1990,
    currency: 'TWD',
    unit: 'each',
    label: null,
  },
  summary: '熱插拔小尺寸鍵盤',
  description: '適合長時間寫程式的繁中鍵盤',
  purchase_url: 'https://example.com/product',
  image_url: 'https://example.com/product.jpg',
  channel_id: 'pchome',
  category_id: 'computer',
  tag_ids: ['keyboard', 'usb-c'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}
const products_dir_url = new URL('../content/products/', import.meta.url)
const guides_dir_url = new URL('../content/guides/', import.meta.url)
const links_dir_url = new URL('../content/links/', import.meta.url)
const search_index_url = new URL('../public/search-index.json', import.meta.url)
const execFileAsync = promisify(execFile)

const base_guide: Guide = {
  id: '2026-06-02-guide',
  status: 'published',
  title: '日本米入門篇',
  summary: '如何挑選日本米',
  source_url: 'https://example.com/guide',
  image_url: null,
  category_ids: ['food'],
  tag_ids: ['rice'],
  related_product_ids: [],
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const base_link: LinkDefinition = {
  id: 'applepig-home',
  status: 'published',
  title: 'applepig.idv.tw',
  summary: 'DW 的主站入口',
  url: 'https://applepig.idv.tw',
  icon: 'i-lucide-link',
  category_ids: ['other'],
  tag_ids: [],
  sort_order: 10,
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const test_tags: TagDefinition[] = [
  { id: 'keyboard', label: '鍵盤', description: '鍵盤', aliases: [], nav_visible: true, sort_order: 10 },
  { id: 'usb-c', label: 'USB-C', description: 'USB-C', aliases: [], nav_visible: true, sort_order: 20 },
  { id: 'mouse', label: '滑鼠', description: '滑鼠', aliases: [], nav_visible: true, sort_order: 30 },
  { id: 'rice', label: '日本米', description: '日本米', aliases: [], nav_visible: true, sort_order: 40 },
  { id: 'shared-token', label: 'shared-token', description: 'shared-token', aliases: [], nav_visible: true, sort_order: 50 },
]

const temp_paths: string[] = []

afterEach(async () => {
  vi.unstubAllGlobals()

  await Promise.all(temp_paths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

function readContentProducts(): Product[] {
  return readdirSync(products_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => JSON.parse(readFileSync(new URL(file_name, products_dir_url), 'utf8')) as Product)
}

function readContentGuides(): Guide[] {
  return readdirSync(guides_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => JSON.parse(readFileSync(new URL(file_name, guides_dir_url), 'utf8')) as Guide)
}

function readContentLinks(): LinkDefinition[] {
  return readdirSync(links_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => JSON.parse(readFileSync(new URL(file_name, links_dir_url), 'utf8')) as LinkDefinition)
}

function readStaticSearchIndexPayload() {
  return JSON.parse(readFileSync(search_index_url, 'utf8')) as ReturnType<typeof buildSearchIndexPayload>
}

describe('search index', () => {
  it('should map published products to search documents', () => {
    expect(getSearchDocuments({ products: [base_product], guides: [], links: [] }, { tags: test_tags })).toEqual([
      {
        document_id: 'product:2026-06-02-sample-product',
        content_id: '2026-06-02-sample-product',
        type: 'product',
        title: '機械鍵盤',
        summary: '熱插拔小尺寸鍵盤',
        category_ids: ['computer'],
        category_labels: ['電腦'],
        tag_ids: ['keyboard', 'usb-c'],
        tag_labels: ['鍵盤', 'USB-C'],
        image_url: 'https://example.com/product.jpg',
        href: '/products/2026-06-02-sample-product',
        external: false,
        price_text: 'NT$ 1,990',
        channel_id: 'pchome',
        channel_label: 'PChome',
        published_at: '2026-06-02T00:00:00+08:00',
      },
    ])
  })

  it('should map published guides and links to external search documents', () => {
    expect(getSearchDocuments({ products: [], guides: [base_guide], links: [base_link] }, { tags: test_tags })).toEqual([
      {
        document_id: 'guide:2026-06-02-guide',
        content_id: '2026-06-02-guide',
        type: 'guide',
        title: '日本米入門篇',
        summary: '如何挑選日本米',
        category_ids: ['food'],
        category_labels: ['食材'],
        tag_ids: ['rice'],
        tag_labels: ['日本米'],
        image_url: null,
        href: 'https://example.com/guide',
        external: true,
        published_at: '2026-06-02T00:00:00+08:00',
      },
      {
        document_id: 'link:applepig-home',
        content_id: 'applepig-home',
        type: 'link',
        title: 'applepig.idv.tw',
        summary: 'DW 的主站入口',
        category_ids: ['other'],
        category_labels: ['其他'],
        tag_ids: [],
        tag_labels: [],
        image_url: null,
        href: 'https://applepig.idv.tw',
        external: true,
        published_at: '2026-06-02T00:00:00+08:00',
      },
    ])
  })

  it('should map the fallback other category to the taxonomy label for search documents', () => {
    expect(getSearchDocuments({ products: [{
      ...base_product,
      id: 'other-category-product',
      category_id: 'other',
    }], guides: [], links: [] })).toEqual([
      expect.objectContaining({
        document_id: 'product:other-category-product',
        category_ids: ['other'],
        category_labels: ['其他'],
      }),
    ])
  })

  it('should exclude draft, unpublished and archived content from documents and index', () => {
    const products = [
      base_product,
      { ...base_product, id: 'draft-product', status: 'draft' as const, name: '草稿商品' },
      { ...base_product, id: 'unpublished-product', status: 'unpublished' as const, name: '下架商品' },
      { ...base_product, id: 'archived-product', status: 'archived' as const, name: '封存商品' },
    ]
    const guides = [
      base_guide,
      { ...base_guide, id: 'draft-guide', status: 'draft' as const, title: '草稿指南' },
    ]
    const links = [
      base_link,
      { ...base_link, id: 'archived-link', status: 'archived' as const, title: '封存連結' },
    ]

    const payload = buildSearchIndexPayload({ products, guides, links }, { generated_at: '2026-06-06T00:00:00+08:00' })
    const mini_search = MiniSearch.loadJSON(JSON.stringify(payload.index), {
      ...getSearchOptions(),
    })

    expect(payload.documents.map((document) => document.document_id)).toEqual([
      'product:2026-06-02-sample-product',
      'guide:2026-06-02-guide',
      'link:applepig-home',
    ])
    expect(mini_search.search('草稿商品')).toEqual([])
    expect(mini_search.search('下架商品')).toEqual([])
    expect(mini_search.search('封存商品')).toEqual([])
    expect(mini_search.search('草稿指南')).toEqual([])
    expect(mini_search.search('封存連結')).toEqual([])
  })

  it('should build the static JSON contract and restore it with MiniSearch.loadJSON', () => {
    const payload = buildSearchIndexPayload({ products: [base_product], guides: [], links: [] }, {
      generated_at: '2026-06-06T00:00:00+08:00',
      tags: test_tags,
    })
    const mini_search = loadSearchIndex(payload)

    expect(payload).toMatchObject({
      version: SEARCH_INDEX_VERSION,
      generated_at: '2026-06-06T00:00:00+08:00',
      documents: [
        {
          document_id: 'product:2026-06-02-sample-product',
          content_id: '2026-06-02-sample-product',
          type: 'product',
          title: '機械鍵盤',
          category_labels: ['電腦'],
          tag_labels: ['鍵盤', 'USB-C'],
          href: '/products/2026-06-02-sample-product',
          external: false,
          channel_label: 'PChome',
          price_text: 'NT$ 1,990',
          image_url: 'https://example.com/product.jpg',
        },
      ],
    })
    expect(payload.index).toEqual(expect.objectContaining({ documentCount: 1 }))
    expect(mini_search.search('鍵盤')).toHaveLength(1)
    expect(mini_search.search('熱插拔')).toHaveLength(1)
    expect(mini_search.search('電腦')).toHaveLength(1)
    expect(mini_search.search('PChome')).toHaveLength(1)
  })

  it('should query restored index and return UI suggestions', () => {
    const second_product = {
      ...base_product,
      id: '2026-06-03-mouse',
      name: '人體工學滑鼠',
      summary: '垂直握感',
      description: '長時間工作使用',
      tag_ids: ['mouse'],
      price_text: 'NT$ 990',
      image_url: 'https://example.com/mouse.jpg',
      published_at: '2026-06-03T00:00:00+08:00',
    }
    const payload = buildSearchIndexPayload({ products: [base_product, second_product], guides: [], links: [] }, {
      generated_at: '2026-06-06T00:00:00+08:00',
      tags: test_tags,
    })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, '繁中鍵盤')).toEqual([
      {
        document_id: 'product:2026-06-02-sample-product',
        content_id: '2026-06-02-sample-product',
        type: 'product',
        label: '機械鍵盤',
        title: '機械鍵盤',
        summary: '熱插拔小尺寸鍵盤',
        category_labels: ['電腦'],
        tag_labels: ['鍵盤', 'USB-C'],
        image_url: 'https://example.com/product.jpg',
        href: '/products/2026-06-02-sample-product',
        external: false,
        price_text: 'NT$ 1,990',
        channel_id: 'pchome',
        channel_label: 'PChome',
        score: expect.any(Number),
      },
    ])
    expect(querySearchIndex(mini_search, '   ')).toEqual([])
  })

  it('should return complete search results while allowing autocomplete to limit the first 12 suggestions', () => {
    const products = Array.from({ length: 13 }, (_, index) => ({
      ...base_product,
      id: `shared-product-${index + 1}`,
      name: index === 12 ? 'Lower Relevance Product' : `Shared Token Product ${index + 1}`,
      tag_ids: ['shared-token'],
      published_at: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00+08:00`,
    }))
    const payload = buildSearchIndexPayload({ products, guides: [], links: [] }, {
      generated_at: '2026-06-06T00:00:00+08:00',
      tags: test_tags,
    })
    const mini_search = loadSearchIndex(payload)

    const complete_results = querySearchIndex(mini_search, 'shared-token')
    const autocomplete_results = querySearchIndex(mini_search, 'shared-token', 12)

    expect(complete_results).toHaveLength(13)
    expect(complete_results.map((result) => result.document_id)).toContain('product:shared-product-13')
    expect(autocomplete_results).toHaveLength(12)
    expect(autocomplete_results.map((result) => result.document_id)).not.toContain('product:shared-product-13')
  })

  it('should use the product filename stem as the build output document id', async () => {
    const temp_dir = await mkdtemp(join(tmpdir(), 'dwselect-search-index-'))
    temp_paths.push(temp_dir)
    const products_dir = join(temp_dir, 'products')
    const output_path = join(temp_dir, 'public', 'search-index.json')
    await mkdir(products_dir)
    await writeFile(join(products_dir, '2026-06-07-filename-stem.json'), JSON.stringify({
      id: 'internal-json-id',
      status: 'published',
      name: '檔名商品',
      price_text: 'NT$ 1,990',
      price: {
        amount: 1990,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '適合長時間寫程式的繁中鍵盤',
      description: '適合長時間寫程式的繁中鍵盤',
      purchase_url: 'https://example.com/product',
      image_url: 'https://example.com/product.jpg',
      channel_id: 'other',
      category_id: 'computer',
      tag_ids: ['keyboard', 'usb-c'],
      reference_url: 'https://example.com/reference',
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    }))

    await buildSearchIndexFile(products_dir, output_path)

    const payload = JSON.parse(await readFile(output_path, 'utf8')) as ReturnType<typeof buildSearchIndexPayload>
    const mini_search = loadSearchIndex(payload)

    expect(payload.documents).toEqual([
      expect.objectContaining({
        document_id: 'product:2026-06-07-filename-stem',
        content_id: '2026-06-07-filename-stem',
        title: '檔名商品',
      }),
    ])
    expect(querySearchIndex(mini_search, '檔名商品')).toEqual([
      expect.objectContaining({
        document_id: 'product:2026-06-07-filename-stem',
        content_id: '2026-06-07-filename-stem',
        category_labels: ['電腦'],
        channel_label: '其他通路',
      }),
    ])
  })

  it('should run the search index build script directly with Node ESM', async () => {
    const temp_dir = await mkdtemp(join(tmpdir(), 'dwselect-search-index-cli-'))
    temp_paths.push(temp_dir)
    const products_dir = join(temp_dir, 'products')
    const output_path = join(temp_dir, 'public', 'search-index.json')
    await mkdir(products_dir)
    await writeFile(join(products_dir, '2026-06-08-node-esm.json'), JSON.stringify(base_product))

    const { stdout } = await execFileAsync(process.execPath, [
      'scripts/build-search-index.ts',
      '--products-dir',
      products_dir,
      '--out',
      output_path,
      '--taxonomies-dir',
      join(temp_dir, 'taxonomies'),
    ])
    const payload = JSON.parse(await readFile(output_path, 'utf8')) as ReturnType<typeof buildSearchIndexPayload>

    expect(stdout).toContain(`Search index written: ${output_path}`)
    expect(payload.documents).toEqual([
      expect.objectContaining({
        document_id: 'product:2026-06-08-node-esm',
        content_id: '2026-06-08-node-esm',
      }),
    ])
  })

  it('should allow a fallback-tokenized query to search an index built with Intl.Segmenter tokens', () => {
    class Segmenter {
      segment() {
        return [
          { segment: '機械', isWordLike: true },
          { segment: '鍵盤', isWordLike: true },
        ]
      }
    }

    vi.stubGlobal('Intl', { ...Intl, Segmenter })
    const payload = buildSearchIndexPayload({ products: [base_product], guides: [], links: [] }, {
      generated_at: '2026-06-06T00:00:00+08:00',
      tags: test_tags,
    })
    vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, '機械鍵盤')).toEqual([
      expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }),
    ])
  })

  it('should keep the generated static search index document count aligned with cutover content', () => {
    const published_count = [
      ...readContentProducts(),
      ...readContentGuides(),
      ...readContentLinks(),
    ].filter((content) => content.status === 'published').length
    const payload = readStaticSearchIndexPayload()

    expect(published_count).toBe(67)
    expect(payload.documents).toHaveLength(published_count)
    expect(payload.index.documentCount).toBe(published_count)
    expect(payload.documents.map((document) => document.document_id)).not.toContain('product:2026-06-02-sample-product')
    expect(payload.documents.map((document) => document.document_id)).not.toEqual(expect.arrayContaining([
      'product:2026-06-02-日本米入門篇',
      'product:2026-06-02-aeron-chair',
      'product:2026-06-02-b18',
      'product:2026-06-02-altwork-station',
    ]))
    expect(payload.documents.map((document) => document.document_id)).toEqual(expect.arrayContaining([
      'guide:2026-06-02-日本米入門篇',
      'guide:2026-06-02-aeron-chair',
      'link:2026-06-02-b18',
      'link:2026-06-02-altwork-station',
      'link:applepig-home',
    ]))
    expect(readContentProducts().map((product) => product.id)).toEqual(
      readdirSync(products_dir_url)
        .filter((file_name) => file_name.endsWith('.json'))
        .map((file_name) => parse(file_name).name)
        .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name)),
    )
    expect(payload.documents).toContainEqual(expect.objectContaining({
      document_id: 'product:2026-06-02-sharp-65吋-xled',
      title: 'Sharp 65吋 XLED',
      category_labels: ['影音'],
      channel_label: expect.any(String),
    }))
  })

  it('should query real mixed content names, summaries, category labels, channel labels and tags from the generated static search index', () => {
    const mini_search = loadSearchIndex(readStaticSearchIndexPayload())

    expect(querySearchIndex(mini_search, 'Sharp 65吋 XLED')).toContainEqual(expect.objectContaining({
      document_id: 'product:2026-06-02-sharp-65吋-xled',
      label: 'Sharp 65吋 XLED',
      type: 'product',
      category_labels: ['影音'],
    }))
    expect(querySearchIndex(mini_search, '日本米入門篇')).toContainEqual(expect.objectContaining({
      document_id: 'guide:2026-06-02-日本米入門篇',
      type: 'guide',
      external: true,
      href: expect.stringMatching(/^https?:\/\//),
    }))
    expect(querySearchIndex(mini_search, 'B18')).toContainEqual(expect.objectContaining({
      document_id: 'link:2026-06-02-b18',
      type: 'link',
      external: true,
      href: expect.stringMatching(/^https?:\/\//),
    }))
    expect(querySearchIndex(mini_search, '如果不想買OLED').length).toBeGreaterThan(0)
    expect(querySearchIndex(mini_search, 'Sharp XLED應該是最好的選擇').length).toBeGreaterThan(0)
    expect(querySearchIndex(mini_search, '影音').length).toBeGreaterThan(0)
    expect(querySearchIndex(mini_search, 'PCHome').length).toBeGreaterThan(0)
  })
})
