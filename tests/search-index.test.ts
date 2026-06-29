import MiniSearch from 'minisearch'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CategoryDefinition, ChannelDefinition, Guide, LinkDefinition, Product, TagDefinition } from '../app/utils/product-schema'
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
  slug: '2026-06-02-sample-product',
  status: 'published',
  name: '機械鍵盤',
  english_name: 'Mechanical Keyboard',
  summary: '熱插拔小尺寸鍵盤',
  long_description: '適合長時間寫程式的繁中鍵盤',
  llm_description: 'Alice layout with gasket mount',
  search_aliases: ['客製化鍵盤'],
  model_numbers: ['MK-01'],
  offers: [
    {
      channel_id: 'pchome',
      url: 'https://example.com/product',
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
  category_id: 'computer',
  tag_ids: ['keyboard', 'usb-c', 'fixture-brand'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}
const execFileAsync = promisify(execFile)

const base_guide: Guide = {
  id: '2026-06-02-guide',
  slug: '2026-06-02-guide',
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
  slug: 'applepig-home',
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

const test_categories: CategoryDefinition[] = [
  { id: 'home', label: '居家', short_label: '居家', nav_visible: true, sort_order: 10 },
  { id: 'kitchen', label: '廚房', short_label: '廚房', nav_visible: true, sort_order: 20 },
  { id: 'computer', label: '電腦', short_label: '電腦', nav_visible: true, sort_order: 30 },
  { id: 'three-c', label: '3C', short_label: '3C', nav_visible: true, sort_order: 40 },
  { id: 'av', label: '影音', short_label: '影音', nav_visible: true, sort_order: 50 },
  { id: 'food', label: '食材', short_label: '食材', nav_visible: true, sort_order: 60 },
  { id: 'other', label: '其他', short_label: '其他', nav_visible: true, sort_order: 999 },
]

const test_channels: ChannelDefinition[] = [
  { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
  { id: 'momo', label: 'momo', tint: 'pink', host_patterns: ['www.momoshop.com.tw'], sort_order: 20 },
  { id: 'amazonjp', label: 'Amazon JP', tint: 'amber', host_patterns: ['www.amazon.co.jp', 'amzn.asia'], sort_order: 30 },
  { id: 'amazonus', label: 'Amazon US', tint: 'amber', host_patterns: ['www.amazon.com'], sort_order: 40 },
  { id: 'costco', label: 'Costco', tint: 'indigo', host_patterns: ['www.costco.com.tw'], sort_order: 50 },
  { id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 999 },
]

const test_tags: TagDefinition[] = [
  { id: 'keyboard', label: '鍵盤', description: '鍵盤', aliases: ['打字'], nav_visible: true, sort_order: 10 },
  { id: 'usb-c', label: 'USB-C', description: 'USB-C', aliases: [], nav_visible: true, sort_order: 20 },
  { id: 'mouse', label: '滑鼠', description: '滑鼠', aliases: [], nav_visible: true, sort_order: 30 },
  { id: 'rice', label: '日本米', description: '日本米', aliases: [], nav_visible: true, sort_order: 40 },
  { id: 'shared-token', label: 'shared-token', description: 'shared-token', aliases: [], nav_visible: true, sort_order: 50 },
]

const test_brands: TagDefinition[] = [
  { id: 'fixture-brand', label: 'Fixture Brand', description: 'Fixture Brand', aliases: ['測試牌'], nav_visible: true, sort_order: 10 },
]

const test_taxonomies = {
  categories: test_categories,
  channels: test_channels,
  tags: test_tags,
  brands: test_brands,
}

const temp_paths: string[] = []

afterEach(async () => {
  vi.unstubAllGlobals()

  await Promise.all(temp_paths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('search index', () => {
  it('should map published products to search documents', () => {
    expect(getSearchDocuments({ products: [base_product], guides: [], links: [] }, test_taxonomies)).toEqual([
      {
        document_id: 'product:2026-06-02-sample-product',
        content_id: '2026-06-02-sample-product',
        type: 'product',
        title: '機械鍵盤',
        summary: '熱插拔小尺寸鍵盤',
        category_ids: ['computer'],
        category_labels: ['電腦'],
        tag_ids: ['keyboard', 'usb-c', 'fixture-brand'],
        tag_labels: ['鍵盤', 'USB-C', 'Fixture Brand'],
        image_url: '/products/images/2026-06-02-sample-product.jpg',
        href: '/products/2026-06-02-sample-product',
        external: false,
        price_text: 'NT$ 1,990',
        channel_id: 'pchome',
        channel_label: 'PChome',
        published_at: '2026-06-02T00:00:00+08:00',
      },
    ])
  })

  it('should resolve local product image files in search documents', () => {
    expect(getSearchDocuments({
      products: [{
        ...base_product,
        image_file: '2026-06-02-sample-product.jpg',
        image_url: null,
      }],
      guides: [],
      links: [],
    }, test_taxonomies)).toEqual([
      expect.objectContaining({
        document_id: 'product:2026-06-02-sample-product',
        image_url: '/products/images/2026-06-02-sample-product.jpg',
      }),
    ])
  })

  it('should reject published products without a local image file in search documents', () => {
    expect(() => getSearchDocuments({
      products: [{
        ...base_product,
        image_file: null,
        image_url: 'https://example.com/product.jpg',
      }],
      guides: [],
      links: [],
    }, test_taxonomies)).toThrow('Published product image_file is required')
  })

  it('should map published guides to internal search documents while keeping links external', () => {
    expect(getSearchDocuments({ products: [], guides: [base_guide], links: [base_link] }, test_taxonomies)).toEqual([
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
        href: '/guide/2026-06-02-guide',
        external: false,
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

  it('should resolve local guide image files in search documents', () => {
    expect(getSearchDocuments({
      products: [],
      guides: [{
        ...base_guide,
        image_file: '2026-06-02-guide.jpg',
        image_url: null,
      }],
      links: [],
    }, test_taxonomies)).toEqual([
      expect.objectContaining({
        document_id: 'guide:2026-06-02-guide',
        image_url: '/guides/images/2026-06-02-guide.jpg',
      }),
    ])
  })

  it('should fall back to external guide image urls in search documents, payload summaries and query results', () => {
    const payload = buildSearchIndexPayload({
      products: [],
      guides: [{
        ...base_guide,
        title: '外部圖片指南',
        image_file: null,
        image_url: 'https://scontent.ftpe8-2.fna.fbcdn.net/example.jpg',
      }],
      links: [],
    }, { ...test_taxonomies, generated_at: '2026-06-06T00:00:00+08:00' })
    const mini_search = loadSearchIndex(payload)

    expect(getSearchDocuments({ products: [], guides: [{
      ...base_guide,
      title: '外部圖片指南',
      image_file: null,
      image_url: 'https://scontent.ftpe8-2.fna.fbcdn.net/example.jpg',
    }], links: [] }, test_taxonomies)).toEqual([
      expect.objectContaining({
        document_id: 'guide:2026-06-02-guide',
        image_url: 'https://scontent.ftpe8-2.fna.fbcdn.net/example.jpg',
      }),
    ])
    expect(payload.documents).toEqual([
      expect.objectContaining({
        document_id: 'guide:2026-06-02-guide',
        image_url: 'https://scontent.ftpe8-2.fna.fbcdn.net/example.jpg',
      }),
    ])
    expect(querySearchIndex(mini_search, '外部圖片指南')).toEqual([
      expect.objectContaining({
        document_id: 'guide:2026-06-02-guide',
        image_url: 'https://scontent.ftpe8-2.fna.fbcdn.net/example.jpg',
      }),
    ])
  })

  it('should preserve optional link images in search documents, payload summaries and query results', () => {
    const payload = buildSearchIndexPayload({
      products: [],
      guides: [],
      links: [{
        ...base_link,
        title: '圖片連結',
        image_url: 'https://example.com/link-logo.png',
      }],
    }, { ...test_taxonomies, generated_at: '2026-06-06T00:00:00+08:00' })
    const mini_search = loadSearchIndex(payload)

    expect(getSearchDocuments({ products: [], guides: [], links: [{
      ...base_link,
      title: '圖片連結',
      image_url: 'https://example.com/link-logo.png',
    }] }, test_taxonomies)).toEqual([
      expect.objectContaining({
        document_id: 'link:applepig-home',
        image_url: 'https://example.com/link-logo.png',
      }),
    ])
    expect(payload.documents).toEqual([
      expect.objectContaining({
        document_id: 'link:applepig-home',
        image_url: 'https://example.com/link-logo.png',
      }),
    ])
    expect(querySearchIndex(mini_search, '圖片連結')).toEqual([
      expect.objectContaining({
        document_id: 'link:applepig-home',
        image_url: 'https://example.com/link-logo.png',
      }),
    ])
  })

  it('should map the fallback other category to the taxonomy label for search documents', () => {
    expect(getSearchDocuments({ products: [{
      ...base_product,
      id: 'other-category-product',
      category_id: 'other',
    }], guides: [], links: [] }, test_taxonomies)).toEqual([
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

    const payload = buildSearchIndexPayload({ products, guides, links }, { ...test_taxonomies, generated_at: '2026-06-06T00:00:00+08:00' })
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
      ...test_taxonomies,
      generated_at: '2026-06-06T00:00:00+08:00',
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
          tag_labels: ['鍵盤', 'USB-C', 'Fixture Brand'],
          href: '/products/2026-06-02-sample-product',
          external: false,
          channel_label: 'PChome',
          price_text: 'NT$ 1,990',
          image_url: '/products/images/2026-06-02-sample-product.jpg',
        },
      ],
    })
    expect(payload.index).toEqual(expect.objectContaining({ documentCount: 1 }))
    expect(mini_search.search('鍵盤')).toHaveLength(1)
    expect(mini_search.search('熱插拔')).toHaveLength(1)
    expect(mini_search.search('電腦')).toHaveLength(1)
    expect(mini_search.search('PChome')).toHaveLength(1)
  })

  it('should index product english names, aliases, model numbers, llm descriptions and taxonomy aliases', () => {
    const payload = buildSearchIndexPayload({ products: [base_product], guides: [], links: [] }, {
      ...test_taxonomies,
      generated_at: '2026-06-06T00:00:00+08:00',
    })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, 'Mechanical Keyboard')).toContainEqual(expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }))
    expect(querySearchIndex(mini_search, '客製化鍵盤')).toContainEqual(expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }))
    expect(querySearchIndex(mini_search, 'MK-01')).toContainEqual(expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }))
    expect(querySearchIndex(mini_search, 'gasket mount')).toContainEqual(expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }))
    expect(querySearchIndex(mini_search, '打字')).toContainEqual(expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }))
    expect(querySearchIndex(mini_search, '測試牌')).toContainEqual(expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }))
  })

  it('should rank product title matches above tags, descriptions, llm descriptions and auxiliary fields', () => {
    const weighted_taxonomies = {
      ...test_taxonomies,
      tags: [
        ...test_tags,
        { id: 'weighted-tag', label: 'boosttoken', description: 'boosttoken', aliases: [], nav_visible: true, sort_order: 60 },
        { id: 'taxonomy-alias-only', label: '輔助欄位標籤', description: '輔助欄位標籤', aliases: ['boosttoken'], nav_visible: true, sort_order: 70 },
      ],
    }
    const products = [
      {
        ...base_product,
        id: 'search-alias-match',
        name: 'A Search Alias Match',
        long_description: '人工描述',
        llm_description: '',
        search_aliases: ['boosttoken'],
        model_numbers: [],
        tag_ids: ['keyboard'],
      },
      {
        ...base_product,
        id: 'model-number-match',
        name: 'B Model Number Match',
        long_description: '人工描述',
        llm_description: '',
        search_aliases: [],
        model_numbers: ['boosttoken'],
        tag_ids: ['keyboard'],
      },
      {
        ...base_product,
        id: 'taxonomy-alias-match',
        name: 'C Taxonomy Alias Match',
        long_description: '人工描述',
        llm_description: '',
        search_aliases: [],
        model_numbers: [],
        tag_ids: ['taxonomy-alias-only'],
      },
      {
        ...base_product,
        id: 'llm-description-match',
        name: 'D LLM Description Match',
        long_description: '人工描述',
        llm_description: 'boosttoken',
        search_aliases: [],
        model_numbers: [],
        tag_ids: ['keyboard'],
      },
      {
        ...base_product,
        id: 'description-match',
        name: 'E Description Match',
        long_description: 'boosttoken',
        llm_description: '',
        search_aliases: [],
        model_numbers: [],
        tag_ids: ['keyboard'],
      },
      {
        ...base_product,
        id: 'tag-match',
        name: 'F Tag Match',
        long_description: '人工描述',
        llm_description: '',
        search_aliases: [],
        model_numbers: [],
        tag_ids: ['weighted-tag'],
      },
      {
        ...base_product,
        id: 'title-match',
        name: 'Z boosttoken Title Match',
        long_description: '人工描述',
        llm_description: '',
        search_aliases: [],
        model_numbers: [],
        tag_ids: ['keyboard'],
      },
    ]
    const payload = buildSearchIndexPayload({ products, guides: [], links: [] }, {
      ...weighted_taxonomies,
      generated_at: '2026-06-06T00:00:00+08:00',
    })
    const mini_search = loadSearchIndex(payload)

    const result_ids = querySearchIndex(mini_search, 'boosttoken').map((result) => result.content_id)

    expect(result_ids).toEqual(expect.arrayContaining([
      'title-match',
      'tag-match',
      'description-match',
      'llm-description-match',
      'search-alias-match',
      'model-number-match',
      'taxonomy-alias-match',
    ]))
    expect(result_ids.indexOf('title-match')).toBeLessThan(result_ids.indexOf('tag-match'))
    expect(result_ids.indexOf('tag-match')).toBeLessThan(result_ids.indexOf('description-match'))
    expect(result_ids.indexOf('description-match')).toBeLessThan(result_ids.indexOf('llm-description-match'))
    expect(result_ids.indexOf('llm-description-match')).toBeLessThan(result_ids.indexOf('search-alias-match'))
    expect(result_ids.indexOf('llm-description-match')).toBeLessThan(result_ids.indexOf('model-number-match'))
    expect(result_ids.indexOf('llm-description-match')).toBeLessThan(result_ids.indexOf('taxonomy-alias-match'))
  })

  it('should search guides and links by tag aliases', () => {
    const guide = { ...base_guide, tag_ids: ['keyboard'] }
    const link = { ...base_link, tag_ids: ['keyboard'] }
    const payload = buildSearchIndexPayload({ products: [], guides: [guide], links: [link] }, {
      ...test_taxonomies,
      generated_at: '2026-06-06T00:00:00+08:00',
    })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, '打字')).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'guide:2026-06-02-guide' }),
      expect.objectContaining({ document_id: 'link:applepig-home' }),
    ]))
  })

  it('should order product documents by canonical category then updated_at then name (catalog-aligned baseline)', () => {
    // ADR 2026-06-18 (revises 2026-06-16): search documents share the catalog canonical
    // comparator (category sort_order -> updated_at desc -> compareText name). The time key
    // was changed from published_at to updated_at. This is a deliberate behaviour change.
    const home_old = { ...base_product, id: 'home-old', name: 'home old', category_id: 'home', updated_at: '2026-06-01T00:00:00+08:00' }
    const home_new = { ...base_product, id: 'home-new', name: 'home new', category_id: 'home', updated_at: '2026-06-05T00:00:00+08:00' }
    const computer_new = { ...base_product, id: 'computer-new', name: 'computer new', category_id: 'computer', updated_at: '2026-06-09T00:00:00+08:00' }

    const documents = getSearchDocuments({ products: [computer_new, home_old, home_new], guides: [], links: [] }, test_taxonomies)

    expect(documents.map((document) => document.document_id)).toEqual([
      'product:home-new',
      'product:home-old',
      'product:computer-new',
    ])
  })

  it('should order guides by updated_at descending and links by sort_order ascending with stable fallbacks', () => {
    const older_guide = { ...base_guide, id: 'older-guide', title: '舊指南', updated_at: '2026-06-01T00:00:00+08:00' }
    const newer_guide = { ...base_guide, id: 'newer-guide', title: '新指南', updated_at: '2026-06-05T00:00:00+08:00' }
    const first_sort_old_link = { ...base_link, id: 'first-sort-old-link', title: '低排序較舊', sort_order: 1, updated_at: '2026-06-01T00:00:00+08:00' }
    const second_sort_new_link = { ...base_link, id: 'second-sort-new-link', title: '高排序較新', sort_order: 2, updated_at: '2026-06-05T00:00:00+08:00' }
    const first_sort_new_link = { ...base_link, id: 'first-sort-new-link', title: '低排序較新', sort_order: 1, updated_at: '2026-06-05T00:00:00+08:00' }

    const documents = getSearchDocuments({
      products: [],
      guides: [older_guide, newer_guide],
      links: [first_sort_old_link, second_sort_new_link, first_sort_new_link],
    }, test_taxonomies)

    // first_sort_old_link keeps its sort_order=1 slot ahead of the newer second_sort link,
    // proving manual sort_order wins over a fresher updated_at.
    expect(documents.map((document) => document.document_id)).toEqual([
      'guide:newer-guide',
      'guide:older-guide',
      'link:first-sort-new-link',
      'link:first-sort-old-link',
      'link:second-sort-new-link',
    ])
  })

  it('should query restored index and return UI suggestions', () => {
    const second_product = {
      ...base_product,
      id: '2026-06-03-mouse',
      name: '人體工學滑鼠',
      english_name: 'Ergonomic Mouse',
      summary: '垂直握感',
      long_description: '長時間工作使用',
      llm_description: '',
      search_aliases: [],
      model_numbers: [],
      tag_ids: ['mouse'],
      offers: [{ ...base_product.offers[0], price_text: 'NT$ 990' }],
      image_file: '2026-06-03-mouse.jpg',
      image_url: null,
      published_at: '2026-06-03T00:00:00+08:00',
    }
    const payload = buildSearchIndexPayload({ products: [base_product, second_product], guides: [], links: [] }, {
      ...test_taxonomies,
      generated_at: '2026-06-06T00:00:00+08:00',
    })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, '客製化鍵盤')).toEqual([
      {
        document_id: 'product:2026-06-02-sample-product',
        content_id: '2026-06-02-sample-product',
        type: 'product',
        label: '機械鍵盤',
        title: '機械鍵盤',
        summary: '熱插拔小尺寸鍵盤',
        category_labels: ['電腦'],
        tag_labels: ['鍵盤', 'USB-C', 'Fixture Brand'],
        image_url: '/products/images/2026-06-02-sample-product.jpg',
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
      ...test_taxonomies,
      generated_at: '2026-06-06T00:00:00+08:00',
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
      slug: 'internal-json-id',
      status: 'published',
      name: '檔名商品',
      english_name: 'Filename Stem',
      summary: '適合長時間寫程式的繁中鍵盤',
      long_description: '適合長時間寫程式的繁中鍵盤',
      llm_description: '',
      search_aliases: [],
      model_numbers: [],
      offers: [
        {
          channel_id: 'other',
          url: 'https://example.com/product',
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
      image_file: '2026-06-07-filename-stem.jpg',
      image_url: null,
      category_id: 'computer-3c',
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
        category_labels: ['電腦3C'],
        channel_label: '其他通路',
      }),
    ])
  })

  it('should reject the search index build when a published product only has an external image url', async () => {
    const temp_dir = await mkdtemp(join(tmpdir(), 'dwselect-search-index-external-image-'))
    temp_paths.push(temp_dir)
    const products_dir = join(temp_dir, 'products')
    const taxonomies_dir = join(temp_dir, 'taxonomies')
    const output_path = join(temp_dir, 'public', 'search-index.json')
    await mkdir(products_dir)
    await mkdir(taxonomies_dir)
    await writeFile(join(products_dir, '2026-06-09-external-image.json'), JSON.stringify({
      ...base_product,
      image_file: null,
      image_url: 'https://example.com/product.jpg',
    }))
    await writeFile(join(taxonomies_dir, 'categories.json'), JSON.stringify({ items: test_categories }))
    await writeFile(join(taxonomies_dir, 'channels.json'), JSON.stringify({ items: test_channels }))
    await writeFile(join(taxonomies_dir, 'tags.json'), JSON.stringify({ items: test_tags }))
    await writeFile(join(taxonomies_dir, 'brands.json'), JSON.stringify({ items: test_brands }))

    await expect(buildSearchIndexFile(products_dir, output_path, taxonomies_dir)).rejects.toThrow('Published product image_file is required')
  })

  it('should run the search index build script directly with Node ESM', async () => {
    const temp_dir = await mkdtemp(join(tmpdir(), 'dwselect-search-index-cli-'))
    temp_paths.push(temp_dir)
    const products_dir = join(temp_dir, 'products')
    const taxonomies_dir = join(temp_dir, 'taxonomies')
    const output_path = join(temp_dir, 'public', 'search-index.json')
    await mkdir(products_dir)
    await mkdir(taxonomies_dir)
    await writeFile(join(products_dir, '2026-06-08-node-esm.json'), JSON.stringify(base_product))
    await writeFile(join(taxonomies_dir, 'categories.json'), JSON.stringify({ items: test_categories }))
    await writeFile(join(taxonomies_dir, 'channels.json'), JSON.stringify({ items: test_channels }))
    await writeFile(join(taxonomies_dir, 'tags.json'), JSON.stringify({ items: test_tags }))
    await writeFile(join(taxonomies_dir, 'brands.json'), JSON.stringify({ items: test_brands }))

    const { stdout } = await execFileAsync(process.execPath, [
      'scripts/build-search-index.ts',
      '--products-dir',
      products_dir,
      '--out',
      output_path,
      '--taxonomies-dir',
      taxonomies_dir,
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
      ...test_taxonomies,
      generated_at: '2026-06-06T00:00:00+08:00',
    })
    vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, '機械鍵盤')).toEqual([
      expect.objectContaining({ document_id: 'product:2026-06-02-sample-product' }),
    ])
  })
})
