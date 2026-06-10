import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

import {
  type CompactAppState,
  type TaxonomyDefinitions,
  getCatalogProductId,
  getCatalogSearchProducts,
  getCatalogView,
  getCompactAppView,
  getCompactAppStateFromRoute,
  getCompactCategoryOptions,
  getGroupedPublishedProducts,
  getPublishedGuides,
  getPublishedLinks,
  getProductDetail,
  getPublishedProducts,
  getRelatedProductCards,
  getResourceRowLinkAttributes,
  getSearchResultSections,
} from '../app/utils/published-products'
import type { Guide, LinkDefinition, Product, TagDefinition } from '../app/utils/product-schema'

const products_dir_url = new URL('../content/products/', import.meta.url)
const guides_dir_url = new URL('../content/guides/', import.meta.url)
const links_dir_url = new URL('../content/links/', import.meta.url)

const base_product = {
  price_text: 'NT$ 1,990',
  price: {
    amount: 1990,
    currency: 'TWD',
    unit: 'each',
    label: null,
  },
  summary: '推薦短評',
  description: '推薦文',
  purchase_url: 'https://example.com/product',
  image_url: 'https://example.com/product.jpg',
  channel_id: 'other',
  category_id: 'home',
  tag_ids: ['tag-a'],
  reference_url: null,
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
} satisfies Omit<Product, 'id' | 'status' | 'name'>

const test_taxonomies: TaxonomyDefinitions = {
  categories: [
    { id: 'home', label: '居家', short_label: '居家', nav_visible: true, sort_order: 10 },
    { id: 'kitchen', label: '廚房', short_label: '廚房', nav_visible: true, sort_order: 20 },
    { id: 'computer', label: '電腦', short_label: '電腦', nav_visible: true, sort_order: 30 },
    { id: 'three-c', label: '3C', short_label: '3C', nav_visible: true, sort_order: 40 },
    { id: 'av', label: '影音', short_label: '影音', nav_visible: true, sort_order: 50 },
    { id: 'food', label: '食材', short_label: '食材', nav_visible: true, sort_order: 60 },
    { id: 'other', label: '其他', short_label: '其他', nav_visible: true, sort_order: 999 },
  ],
  channels: [
    { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
    { id: 'momo', label: 'momo', tint: 'pink', host_patterns: ['www.momoshop.com.tw'], sort_order: 20 },
    { id: 'amazonjp', label: 'Amazon JP', tint: 'amber', host_patterns: ['www.amazon.co.jp', 'amzn.asia'], sort_order: 30 },
    { id: 'amazonus', label: 'Amazon US', tint: 'amber', host_patterns: ['www.amazon.com'], sort_order: 40 },
    { id: 'costco', label: 'Costco', tint: 'indigo', host_patterns: ['www.costco.com.tw'], sort_order: 50 },
    { id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 999 },
  ],
  tags: [
    { id: 'tag-a', label: '標籤 A', description: '測試標籤 A', aliases: [], nav_visible: true, sort_order: 10 },
    { id: 'typing', label: '輸入', description: '輸入設備', aliases: [], nav_visible: true, sort_order: 20 },
    { id: 'wireless', label: '無線', description: '無線設備', aliases: [], nav_visible: true, sort_order: 30 },
    { id: 'shared-token', label: '共同關鍵字', description: '共同關鍵字', aliases: [], nav_visible: true, sort_order: 40 },
  ] satisfies TagDefinition[],
}

const test_links: LinkDefinition[] = [
  {
    id: 'applepig-home',
    status: 'published',
    title: 'applepig.idv.tw',
    summary: 'DW 的主站',
    url: 'https://applepig.idv.tw',
    image_url: null,
    icon: 'i-lucide-link',
    category_ids: ['other'],
    tag_ids: [],
    sort_order: 10,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  },
]

const base_guide = {
  status: 'published',
  title: '指南文章',
  summary: '指南摘要',
  source_url: 'https://example.com/guide',
  image_url: null,
  category_ids: ['computer'],
  tag_ids: ['typing'],
  related_product_ids: [],
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
} satisfies Omit<Guide, 'id'>

function makeProduct(product: Partial<Product> & Pick<Product, 'id' | 'status' | 'name'>): Product {
  return {
    ...base_product,
    ...product,
  }
}

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

describe('published products mapping', () => {
  it('should return only products with published status', () => {
    const products = [
      makeProduct({ id: 'published-product', status: 'published', name: '已上架商品' }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品' }),
      makeProduct({ id: 'unpublished-product', status: 'unpublished', name: '已下架商品' }),
      makeProduct({ id: 'archived-product', status: 'archived', name: '封存商品' }),
    ]

    const published_products = getPublishedProducts(products)

    expect(published_products).toHaveLength(1)
    expect(published_products[0]?.name).toBe('已上架商品')
  })

  it('should map published products to card fields without legacy TSV names', () => {
    const products = [
      makeProduct({
        id: 'published-product',
        status: 'published',
        name: '已上架商品',
        price_text: 'NT$ 2,490',
        purchase_url: 'https://example.com/buy',
        image_url: 'https://example.com/image.jpg',
        category_id: 'computer',
        channel_id: 'pchome',
        summary: '卡片短評',
      }),
    ]

    const published_products = getPublishedProducts(products, test_taxonomies)

    expect(published_products).toEqual([
      {
        id: 'published-product',
        category: '電腦',
        category_id: 'computer',
        channel: 'PChome',
        channel_id: 'pchome',
        description: '推薦文',
        image: 'https://example.com/image.jpg',
        name: '已上架商品',
        price: 'NT$ 2,490',
        published_at: '2026-06-02T00:00:00+08:00',
        purchase_link: 'https://example.com/buy',
        summary: '卡片短評',
        tags: ['標籤 A'],
      },
    ])
    expect(published_products[0]).not.toHaveProperty('price_text')
    expect(published_products[0]).not.toHaveProperty('purchase_url')
    expect(published_products[0]).not.toHaveProperty('image_url')
    expect(published_products[0]).not.toHaveProperty('link_url')
    expect(published_products[0]).not.toHaveProperty('img_url')
  })

  it('should group published product cards by category with stable ordering', () => {
    const products = [
      makeProduct({
        id: 'mouse-new',
        status: 'published',
        name: '滑鼠新品',
        category_id: 'home',
        published_at: '2026-06-04T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-old',
        status: 'published',
        name: '鍵盤舊品',
        category_id: 'computer',
        published_at: '2026-06-01T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-new',
        status: 'published',
        name: '鍵盤新品',
        category_id: 'computer',
        published_at: '2026-06-03T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-draft',
        status: 'draft',
        name: '鍵盤草稿',
        category_id: 'computer',
        published_at: '2026-06-05T00:00:00+08:00',
      }),
    ]

    const grouped_products = getGroupedPublishedProducts(products, test_taxonomies)

    expect(grouped_products).toEqual([
      {
        category: '居家',
        products: [expect.objectContaining({ id: 'mouse-new' })],
      },
      {
        category: '電腦',
        products: [
          expect.objectContaining({ id: 'keyboard-new' }),
          expect.objectContaining({ id: 'keyboard-old' }),
        ],
      },
    ])
  })

  it('should normalize Nuxt Content runtime ids to canonical product ids', () => {
    const product = makeProduct({
      id: 'products/products/2026-06-02-sample-product.json',
      status: 'published',
      name: '範例商品',
    })

    expect(getCatalogProductId(product)).toBe('2026-06-02-sample-product')
    expect(getPublishedProducts([product])).toEqual([
      expect.objectContaining({ id: '2026-06-02-sample-product' }),
    ])
  })
})

describe('catalog view state', () => {
  it('should expose published-only cards, category counts and sort options for UI consumption', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', category_id: 'computer', tag_ids: ['typing'] }),
      makeProduct({ id: 'mouse', status: 'published', name: '無線滑鼠', category_id: 'home', tag_ids: ['wireless'] }),
      makeProduct({ id: 'draft-keyboard', status: 'draft', name: '草稿鍵盤', category_id: 'computer', tag_ids: ['draft'] }),
    ]

    const catalog_view = getCatalogView(products, {}, test_taxonomies)

    expect(catalog_view.counts).toEqual({ published: 2, filtered: 2 })
    expect(catalog_view.products.map((product) => product.id)).toEqual(['mouse', 'keyboard'])
    expect(catalog_view.sections).toEqual([
      {
        category: '居家',
        products: [expect.objectContaining({ id: 'mouse' })],
      },
      {
        category: '電腦',
        products: [expect.objectContaining({ id: 'keyboard' })],
      },
    ])
    expect(catalog_view.category_options).toEqual([
      { label: '全部', value: '全部', count: 2, active: true },
      { label: '居家', value: 'home', count: 1, active: false },
      { label: '廚房', value: 'kitchen', count: 0, active: false },
      { label: '電腦', value: 'computer', count: 1, active: false },
      { label: '3C', value: 'three-c', count: 0, active: false },
      { label: '影音', value: 'av', count: 0, active: false },
      { label: '食材', value: 'food', count: 0, active: false },
      { label: '其他', value: 'other', count: 0, active: false },
    ])
    expect(catalog_view.sort_options).toEqual([
      { label: '預設排序', value: 'default', active: true },
      { label: '最新上架', value: 'latest', active: false },
      { label: '名稱排序', value: 'name', active: false },
    ])
    expect(catalog_view.empty_reason).toBeNull()
  })

  it('should use runtime-independent ordering for CJK categories during hydration', () => {
    const products = [
      makeProduct({ id: 'food', status: 'published', name: '食材商品', category_id: 'food' }),
      makeProduct({ id: 'kitchen', status: 'published', name: '廚房商品', category_id: 'kitchen' }),
      makeProduct({ id: 'home', status: 'published', name: '居家商品', category_id: 'home' }),
    ]

    const catalog_view = getCatalogView(products, {}, test_taxonomies)

    expect(catalog_view.category_options.map((option) => option.label)).toEqual(['全部', '居家', '廚房', '電腦', '3C', '影音', '食材', '其他'])
    expect(catalog_view.sections.map((section) => section.category)).toEqual(['居家', '廚房', '食材'])
    expect(catalog_view.products.map((product) => product.id)).toEqual(['home', 'kitchen', 'food'])
  })

  it('should filter by category without counting non-published products', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', category_id: 'computer' }),
      makeProduct({ id: 'mouse', status: 'published', name: '無線滑鼠', category_id: 'home' }),
      makeProduct({ id: 'draft-mouse', status: 'draft', name: '草稿滑鼠', category_id: 'home' }),
    ]

    const catalog_view = getCatalogView(products, { category: 'home' }, test_taxonomies)

    expect(catalog_view.products.map((product) => product.id)).toEqual(['mouse'])
    expect(catalog_view.sections).toEqual([
      {
        category: '居家',
        products: [expect.objectContaining({ id: 'mouse' })],
      },
    ])
    expect(catalog_view.category_options.find((option) => option.value === 'home')).toEqual({
      label: '居家',
      value: 'home',
      count: 1,
      active: true,
    })
  })

  it('should support catalog sort values with stable ordering', () => {
    const products = [
      makeProduct({
        id: 'keyboard-old',
        status: 'published',
        name: 'B 鍵盤',
        category_id: 'computer',
        published_at: '2026-06-01T00:00:00+08:00',
      }),
      makeProduct({
        id: 'mouse-new',
        status: 'published',
        name: 'C 滑鼠',
        category_id: 'home',
        published_at: '2026-06-04T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-new',
        status: 'published',
        name: 'A 鍵盤',
        category_id: 'computer',
        published_at: '2026-06-03T00:00:00+08:00',
      }),
    ]

    expect(getCatalogView(products, { sort: 'default' }, test_taxonomies).products.map((product) => product.id)).toEqual([
      'mouse-new',
      'keyboard-new',
      'keyboard-old',
    ])
    expect(getCatalogView(products, { sort: 'latest' }, test_taxonomies).products.map((product) => product.id)).toEqual([
      'mouse-new',
      'keyboard-new',
      'keyboard-old',
    ])
    expect(getCatalogView(products, { sort: 'name' }, test_taxonomies).products.map((product) => product.id)).toEqual([
      'keyboard-new',
      'keyboard-old',
      'mouse-new',
    ])
    expect(getCatalogView(products, { sort: 'category' }, test_taxonomies).products.map((product) => product.id)).toEqual([
      'mouse-new',
      'keyboard-new',
      'keyboard-old',
    ])
  })

  it('should keep catalog products from the complete search result set after the autocomplete limit', () => {
    const products = Array.from({ length: 13 }, (_, index) => makeProduct({
      id: `product-${index + 1}`,
      status: 'published',
      name: `共同關鍵字商品 ${index + 1}`,
      category_id: index === 12 ? 'food' : 'home',
      published_at: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00+08:00`,
    }))
    const complete_search_results = products.map((product) => ({ id: product.id }))

    const search_products = getCatalogSearchProducts(products, complete_search_results, '共同關鍵字')
    const catalog_view = getCatalogView(search_products, { category: 'food' }, test_taxonomies)

    expect(search_products).toHaveLength(13)
    expect(catalog_view.products.map((product) => product.id)).toEqual(['product-13'])
  })

  it('should treat empty query as no query and keep the current category and sort state', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', category_id: 'computer' }),
      makeProduct({ id: 'mouse', status: 'published', name: '無線滑鼠', category_id: 'home' }),
    ]

    const catalog_view = getCatalogView(products, { query: '   ', category: 'computer', sort: 'name' }, test_taxonomies)

    expect(catalog_view.query).toBe('')
    expect(catalog_view.category).toBe('computer')
    expect(catalog_view.sort).toBe('name')
    expect(catalog_view.products.map((product) => product.id)).toEqual(['keyboard'])
    expect(catalog_view.empty_reason).toBeNull()
  })

  it('should return an empty-result reason when filters match no published product', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', description: '打字用', category_id: 'computer' }),
      makeProduct({ id: 'draft-monitor', status: 'draft', name: '4K 螢幕', description: '影像用', category_id: 'av' }),
    ]

    const catalog_view = getCatalogView(products, { query: '螢幕' })

    expect(catalog_view.products).toEqual([])
    expect(catalog_view.sections).toEqual([])
    expect(catalog_view.counts).toEqual({ published: 1, filtered: 0 })
    expect(catalog_view.empty_reason).toBe('no-results')
  })

  it('should map long text fields without truncating source values in catalog cards', () => {
    const long_name = '非常長的商品名稱'.repeat(12)
    const long_description = '這是一段很長的推薦描述，測試 catalog helper 不應替 UI 任意截斷。'.repeat(8)
    const long_tag = 'ergonomic-keyboard-long-tag-name'.repeat(4)
    const products = [
      makeProduct({
        id: 'long-text-product',
        status: 'published',
        name: long_name,
        description: long_description,
        summary: long_description,
        tag_ids: [long_tag],
        price_text: 'NT$ 123,456,789 起',
      }),
    ]

    const catalog_view = getCatalogView(products, { query: long_tag })

    expect(catalog_view.products).toEqual([
      expect.objectContaining({
        id: 'long-text-product',
        name: long_name,
        description: long_description,
        summary: long_description,
        tags: [long_tag],
        price: 'NT$ 123,456,789 起',
      }),
    ])
  })
})

describe('post-migration product content', () => {
  it('should keep only product content with taxonomy tag ids after Milestone 2 migration', () => {
    const products = readContentProducts()
    const product_ids = products.map((product) => product.id)

    expect(products).toHaveLength(62)
    expect(product_ids).not.toContain('2026-06-02-sample-product')
    expect(product_ids).not.toEqual(expect.arrayContaining([
      '2026-06-02-日本米入門篇',
      '2026-06-02-aeron-chair',
      '2026-06-02-b18',
      '2026-06-02-altwork-station',
    ]))
    expect(product_ids).toEqual(expect.arrayContaining([
      '2026-06-02-ikea充電線',
      '2026-06-02-三菱重工冷氣',
    ]))
    expect(products.every((product) => Array.isArray(product.tag_ids) && !('tags' in product))).toBe(true)
  })
})

describe('published guide and link mapping', () => {
  it('should map only published guides to external resource rows with taxonomy labels', () => {
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'published-guide',
        title: '已發布指南',
        source_url: 'https://example.com/published-guide',
        image_url: null,
        category_ids: ['computer'],
        tag_ids: ['typing'],
      },
      {
        ...base_guide,
        id: 'draft-guide',
        status: 'draft',
        title: '草稿指南',
      },
    ]

    expect(getPublishedGuides(guides, test_taxonomies)).toEqual([
      {
        id: 'published-guide',
        type: 'guide',
        title: '已發布指南',
        subtitle: '指南摘要',
        meta: '電腦',
        href: 'https://example.com/published-guide',
        image_url: null,
        icon: 'i-lucide-book-open',
        external: true,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ])
  })

  it('should map only published links to external resource rows with image fallback and safe attributes', () => {
    const links: LinkDefinition[] = [
      ...test_links,
      {
        ...test_links[0]!,
        id: 'archived-link',
        status: 'archived',
        title: '封存連結',
      },
    ]

    expect(getPublishedLinks(links)).toEqual([
      {
        id: 'applepig-home',
        type: 'link',
        title: 'applepig.idv.tw',
        subtitle: 'DW 的主站',
        meta: 'https://applepig.idv.tw',
        href: 'https://applepig.idv.tw',
        image_url: null,
        icon: 'i-lucide-link',
        external: true,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ])
  })

  it('should preserve optional link images in resource rows', () => {
    const links: LinkDefinition[] = [
      {
        ...test_links[0]!,
        image_url: 'https://example.com/applepig-logo.png',
      },
    ]

    expect(getPublishedLinks(links)).toEqual([
      expect.objectContaining({
        id: 'applepig-home',
        image_url: 'https://example.com/applepig-logo.png',
        icon: 'i-lucide-link',
      }),
    ])
  })

  it('should derive safe attributes for external and internal resource rows', () => {
    expect(getResourceRowLinkAttributes({
      id: 'external-guide',
      type: 'guide',
      title: '外部指南',
      subtitle: '外部摘要',
      meta: null,
      href: 'https://example.com/guide',
      image_url: null,
      icon: 'i-lucide-book-open',
      external: true,
      target: '_blank',
      rel: 'noopener noreferrer',
    })).toEqual({
      href: 'https://example.com/guide',
      target: '_blank',
      rel: 'noopener noreferrer',
    })

    expect(getResourceRowLinkAttributes({
      id: 'internal-guide',
      type: 'guide',
      title: '站內指南',
      subtitle: '站內摘要',
      meta: null,
      href: '/guide/internal-guide',
      image_url: null,
      icon: 'i-lucide-book-open',
      external: false,
      target: null,
      rel: null,
    })).toEqual({
      to: '/guide/internal-guide',
    })
  })

  it('should keep migrated guide and link content available outside products', () => {
    expect(readContentGuides().map((guide) => guide.id)).toEqual([
      '2026-06-02-aeron-chair',
      '2026-06-02-日本米入門篇',
    ])
    expect(readContentLinks().map((link) => link.id)).toEqual([
      '2026-06-02-altwork-station',
      '2026-06-02-b18',
      'applepig-home',
    ])
  })
})

describe('compact app view state', () => {
  const test_guides: Guide[] = [
    {
      ...base_guide,
      id: 'guide-keyboard',
      title: '鍵盤入門',
      summary: '挑選鍵盤前先看這篇',
      source_url: 'https://example.com/keyboard-guide',
      image_url: 'https://example.com/keyboard-guide.jpg',
      category_ids: ['computer'],
      tag_ids: ['typing'],
      published_at: '2026-06-03T00:00:00+08:00',
    },
  ]

  function getCompactView(products: Product[], state: CompactAppState = {}, links = test_links, guides = test_guides) {
    return getCompactAppView(products, state, test_taxonomies, links, guides)
  }

  it('should expose four compact tabs and category chips for home filtering', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', category_id: 'home' }),
    ]

    const compact_view = getCompactView(products, { active_tab: 'home', home_category_id: 'computer' })

    expect(compact_view.tabs).toEqual([
      { id: 'home', label: '首頁', icon: 'i-lucide-house', active: true },
      { id: 'guide', label: '指南', icon: 'i-lucide-tags', active: false },
      { id: 'search', label: '搜尋', icon: 'i-lucide-search', active: false },
      { id: 'links', label: '連結', icon: 'i-lucide-link', active: false },
    ])
    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 2, active: false },
      { id: 'home', label: '居家', count: 1, active: false },
      { id: 'computer', label: '電腦', count: 1, active: true },
    ])
    expect(compact_view.home.products.map((product) => product.id)).toEqual(['computer-product'])
  })

  it('should share compact category options between home chips and desktop sidebar', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'draft-kitchen-product', status: 'draft', name: '廚房草稿', category_id: 'kitchen' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
    ]

    const shared_category_options = getCompactCategoryOptions(products, 'all', test_taxonomies)
    const compact_view = getCompactView(products, { active_tab: 'home' })

    expect(shared_category_options).toEqual([
      { id: 'all', label: '全部', count: 2, active: true },
      { id: 'home', label: '居家', count: 1, active: false },
      { id: 'computer', label: '電腦', count: 1, active: false },
    ])
    expect(compact_view.home.category_chips).toEqual(shared_category_options)
    expect(shared_category_options.map((option) => option.id)).not.toContain('kitchen')
  })

  it('should expose published guide resources from the guides content domain', () => {
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'published-guide',
        title: '已發布指南',
        summary: '指南摘要',
        source_url: 'https://example.com/published-guide',
        category_ids: ['computer'],
        tag_ids: ['typing'],
      },
      {
        ...base_guide,
        id: 'draft-guide',
        status: 'draft',
        title: '草稿指南',
      },
    ]

    const compact_view = getCompactView([], { active_tab: 'guide' }, test_links, guides)

    expect(compact_view.guide.guides).toEqual([
      {
        id: 'published-guide',
        type: 'guide',
        title: '已發布指南',
        subtitle: '指南摘要',
        meta: '電腦',
        href: 'https://example.com/published-guide',
        image_url: null,
        icon: 'i-lucide-book-open',
        external: true,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ])
    expect(compact_view.guide.empty_reason).toBeNull()
  })

  it('should expose top tags ordered by usage and label', () => {
    const products = [
      makeProduct({ id: 'one', status: 'published', name: '一號', tag_ids: ['影音', '工作'] }),
      makeProduct({ id: 'two', status: 'published', name: '二號', tag_ids: ['影音', '居家'] }),
      makeProduct({ id: 'three', status: 'published', name: '三號', tag_ids: ['工作'] }),
    ]

    const compact_view = getCompactView(products)

    expect(compact_view.top_tags).toEqual([
      { label: '工作', count: 2, active: false },
      { label: '影音', count: 2, active: false },
      { label: '居家', count: 1, active: false },
      { label: '輸入', count: 1, active: false },
    ])
  })

  it('should expose top tags from published products, guides and links with taxonomy labels and a 10 item limit', () => {
    const tag_ids = Array.from({ length: 12 }, (_, index) => `tag-${index + 1}`)
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      tags: tag_ids.map((tag_id, index) => ({
        id: tag_id,
        label: index === 0 ? 'Alpha' : `標籤 ${String(index + 1).padStart(2, '0')}`,
        description: tag_id,
        aliases: [],
        nav_visible: true,
        sort_order: index + 1,
      })),
    }
    const products = [
      makeProduct({ id: 'published-product', status: 'published', name: '已上架商品', tag_ids }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', tag_ids: ['tag-1'] }),
    ]
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'published-guide',
        tag_ids: ['tag-1', 'tag-2'],
      },
      {
        ...base_guide,
        id: 'draft-guide',
        status: 'draft',
        tag_ids: ['tag-1'],
      },
    ]
    const links: LinkDefinition[] = [
      {
        ...test_links[0]!,
        id: 'published-link',
        tag_ids: ['tag-2', 'tag-3'],
      },
      {
        ...test_links[0]!,
        id: 'archived-link',
        status: 'archived',
        tag_ids: ['tag-1'],
      },
    ]

    const compact_view = getCompactView(products, {}, links, guides)
    const compact_view_with_taxonomies = getCompactAppView(products, {}, taxonomies, links, guides)

    expect(compact_view_with_taxonomies.top_tags).toEqual([
      { label: '標籤 02', count: 3, active: false },
      { label: 'Alpha', count: 2, active: false },
      { label: '標籤 03', count: 2, active: false },
      { label: '標籤 04', count: 1, active: false },
      { label: '標籤 05', count: 1, active: false },
      { label: '標籤 06', count: 1, active: false },
      { label: '標籤 07', count: 1, active: false },
      { label: '標籤 08', count: 1, active: false },
      { label: '標籤 09', count: 1, active: false },
      { label: '標籤 10', count: 1, active: false },
    ])
    expect(compact_view.top_tags).toHaveLength(10)
  })

  it('should filter search tab by query and expose empty and no-results states', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '打字工作用', tag_ids: ['輸入'] }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', summary: '影音用', category_id: 'av', tag_ids: ['影音'] }),
    ]

    expect(getCompactView(products, { search_query: '' }).search.empty_reason).toBe('empty-query')
    expect(getCompactView(products, { search_query: '工作' }).search.products.map((product) => product.id)).toEqual(['keyboard'])
    expect(getCompactView(products, { search_query: '不存在' }).search.empty_reason).toBe('no-results')
  })

  it('should use static search result ids for the search tab when the client index succeeds', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '本機 fallback 找不到這個查詢' }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', category_id: 'av', summary: '本機 fallback 也找不到' }),
      makeProduct({ id: 'draft-match', status: 'draft', name: '草稿商品' }),
    ]

    const compact_view = getCompactView(products, {
      search_query: 'static-index-only',
      search_result_ids: ['speaker', 'keyboard', 'draft-match'],
    })

    expect(compact_view.search.products.map((product) => product.id)).toEqual(['speaker', 'keyboard'])
    expect(compact_view.search.empty_reason).toBeNull()
  })

  it('should group mixed search suggestions into fixed non-empty resource sections', () => {
    const sections = getSearchResultSections([
      {
        document_id: 'link:applepig-home',
        content_id: 'applepig-home',
        type: 'link',
        label: 'applepig.idv.tw',
        title: 'applepig.idv.tw',
        summary: 'DW 的主站',
        category_labels: ['其他'],
        tag_labels: [],
        image_url: 'https://example.com/applepig-logo.png',
        href: 'https://applepig.idv.tw',
        external: true,
        score: 3,
      },
      {
        document_id: 'guide:keyboard-guide',
        content_id: 'keyboard-guide',
        type: 'guide',
        label: '鍵盤指南',
        title: '鍵盤指南',
        summary: '鍵盤挑選重點',
        category_labels: ['電腦'],
        tag_labels: ['輸入'],
        image_url: null,
        href: 'https://example.com/keyboard-guide',
        external: true,
        score: 2,
      },
      {
        document_id: 'product:keyboard',
        content_id: 'keyboard',
        type: 'product',
        label: '機械鍵盤',
        title: '機械鍵盤',
        summary: '打字工作用',
        category_labels: ['電腦'],
        tag_labels: ['輸入'],
        image_url: 'https://example.com/keyboard.jpg',
        href: '/products/keyboard',
        external: false,
        price_text: 'NT$ 1,990',
        channel_label: 'PChome',
        score: 1,
      },
    ])

    expect(sections).toEqual([
      {
        id: 'products',
        label: '商品',
        rows: [
          {
            id: 'product:keyboard',
            type: 'product',
            title: '機械鍵盤',
            subtitle: '打字工作用',
            meta: 'PChome · NT$ 1,990',
            href: '/products/keyboard',
            image_url: 'https://example.com/keyboard.jpg',
            icon: null,
            external: false,
            target: null,
            rel: null,
          },
        ],
      },
      {
        id: 'guides',
        label: '指南',
        rows: [
          {
            id: 'guide:keyboard-guide',
            type: 'guide',
            title: '鍵盤指南',
            subtitle: '鍵盤挑選重點',
            meta: '電腦',
            href: 'https://example.com/keyboard-guide',
            image_url: null,
            icon: 'i-lucide-book-open',
            external: true,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        ],
      },
      {
        id: 'links',
        label: '連結',
        rows: [
          {
            id: 'link:applepig-home',
            type: 'link',
            title: 'applepig.idv.tw',
            subtitle: 'DW 的主站',
            meta: '其他',
            href: 'https://applepig.idv.tw',
            image_url: 'https://example.com/applepig-logo.png',
            icon: 'i-lucide-link',
            external: true,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        ],
      },
    ])
  })

  it('should skip empty mixed search sections', () => {
    const sections = getSearchResultSections([
      {
        document_id: 'guide:keyboard-guide',
        content_id: 'keyboard-guide',
        type: 'guide',
        label: '鍵盤指南',
        title: '鍵盤指南',
        summary: '鍵盤挑選重點',
        category_labels: ['電腦'],
        tag_labels: [],
        image_url: null,
        href: 'https://example.com/keyboard-guide',
        external: true,
        score: 1,
      },
    ])

    expect(sections.map((section) => section.id)).toEqual(['guides'])
  })

  it('should fallback to loaded Nuxt Content products when the client search index fails', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '打字工作用', tag_ids: ['輸入'] }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', summary: '影音用', category_id: 'av', tag_ids: ['影音'] }),
    ]

    const compact_view = getCompactView(products, {
      search_query: '工作',
      search_result_ids: null,
    })

    expect(compact_view.search.products.map((product) => product.id)).toEqual(['keyboard'])
    expect(compact_view.search.empty_reason).toBeNull()
  })

  it('should expose the fallback other category label in compact category chips', () => {
    const products = [
      makeProduct({ id: 'other-product', status: 'published', name: '未知分類商品', category_id: 'other' }),
    ]

    const compact_view = getCompactView(products, { home_category_id: 'other' })

    expect(compact_view.home.category_chips).toEqual([
      { id: 'all', label: '全部', count: 1, active: false },
      { id: 'other', label: '其他', count: 1, active: true },
    ])
    expect(compact_view.home.products.map((product) => product.id)).toEqual(['other-product'])
  })

  it('should expose only published link resources with safe external link attributes', () => {
    const compact_view = getCompactView([], {}, [
      ...test_links,
      {
        ...test_links[0]!,
        id: 'draft-link',
        status: 'draft',
        title: '草稿連結',
        sort_order: 1,
      },
    ])

    expect(compact_view.links).toEqual([
      {
        id: 'applepig-home',
        type: 'link',
        title: 'applepig.idv.tw',
        subtitle: 'DW 的主站',
        meta: 'https://applepig.idv.tw',
        href: 'https://applepig.idv.tw',
        image_url: null,
        icon: 'i-lucide-link',
        external: true,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ])
  })

  it('should expose product detail fields, buy CTA and safe external attributes', () => {
    const product = makeProduct({
      id: 'products/products/detail-product.json',
      status: 'published',
      name: '很長很長的商品名稱'.repeat(6),
      price_text: 'NT$ 123,456,789 起',
      summary: 'DW 怎麼說要保留原始短評'.repeat(4),
      description: '細節說明可以比卡片更長',
      purchase_url: 'https://24h.pchome.com.tw/prod/detail',
      image_url: 'https://example.com/detail.jpg',
      category_id: 'av',
      channel_id: 'pchome',
      tag_ids: ['超長 tag 名稱'.repeat(6), '影音'],
    })

    const detail = getProductDetail(product, test_taxonomies)

    expect(detail).toEqual({
      id: 'detail-product',
      title: product.name,
      hero_image: 'https://example.com/detail.jpg',
      hero_alt: product.name,
      channel_label: 'PChome',
      channel_id: 'pchome',
      category_label: '影音',
      price_label: 'NT$ 123,456,789 起',
      dw_says: product.summary,
      description: '細節說明可以比卡片更長',
      tags: product.tag_ids,
      buy_cta: {
        label: '到 PChome 購買',
        href: 'https://24h.pchome.com.tw/prod/detail',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      fine_print: '價格與庫存以通路頁面為準。',
      related_products: [],
    })
  })

  it('should omit duplicated detail description when it is the same as summary', () => {
    const product = makeProduct({
      id: 'duplicated-description-product',
      status: 'published',
      name: '重複文案商品',
      summary: '同一段推薦文字',
      description: '同一段推薦文字',
    })

    const detail = getProductDetail(product, test_taxonomies)

    expect(detail.dw_says).toBe('同一段推薦文字')
    expect(detail.description).toBeNull()
    expect(detail.related_products).toEqual([])
  })

  it('should sort related products deterministically and exclude the current product', () => {
    const current_product = makeProduct({
      id: 'current-product',
      status: 'published',
      name: '目前商品',
      category_id: 'computer',
      channel_id: 'pchome',
      tag_ids: ['typing', 'wireless'],
      published_at: '2026-06-05T00:00:00+08:00',
    })
    const products = [
      current_product,
      makeProduct({
        id: 'same-category-two-tags-old',
        status: 'published',
        name: '同分類兩個標籤較舊',
        category_id: 'computer',
        channel_id: 'momo',
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-01T00:00:00+08:00',
      }),
      makeProduct({
        id: 'same-category-one-tag-same-channel-old',
        status: 'published',
        name: '同分類同通路較舊',
        category_id: 'computer',
        channel_id: 'pchome',
        tag_ids: ['typing'],
        published_at: '2026-06-02T00:00:00+08:00',
      }),
      makeProduct({
        id: 'same-category-one-tag-new',
        status: 'published',
        name: '同分類較新',
        category_id: 'computer',
        channel_id: 'momo',
        tag_ids: ['typing'],
        published_at: '2026-06-04T00:00:00+08:00',
      }),
      makeProduct({
        id: 'different-category-two-tags-new',
        status: 'published',
        name: '不同分類兩個標籤較新',
        category_id: 'home',
        channel_id: 'pchome',
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-06T00:00:00+08:00',
      }),
      makeProduct({
        id: 'draft-related',
        status: 'draft',
        name: '草稿推薦',
        category_id: 'computer',
        channel_id: 'pchome',
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-07T00:00:00+08:00',
      }),
    ]

    const related_products = getRelatedProductCards(current_product, products, test_taxonomies)

    expect(related_products.map((product) => product.id)).toEqual([
      'same-category-two-tags-old',
      'same-category-one-tag-same-channel-old',
      'same-category-one-tag-new',
      'different-category-two-tags-new',
    ])
  })

  it('should return no related products when every other product is unpublished or current', () => {
    const current_product = makeProduct({
      id: 'current-product',
      status: 'published',
      name: '目前商品',
    })
    const products = [
      current_product,
      makeProduct({
        id: 'draft-product',
        status: 'draft',
        name: '草稿商品',
        category_id: 'computer',
      }),
    ]

    expect(getRelatedProductCards(current_product, products, test_taxonomies)).toEqual([])
  })
})

describe('route-driven compact app state', () => {
  it('should derive active compact tab from route path', () => {
    expect(getCompactAppStateFromRoute({ path: '/', query: {} })).toEqual({
      active_tab: 'home',
      home_category_id: 'all',
    })
    expect(getCompactAppStateFromRoute({ path: '/guide', query: {} })).toEqual({
      active_tab: 'guide',
    })
    expect(getCompactAppStateFromRoute({ path: '/search', query: {} })).toEqual({
      active_tab: 'search',
      search_query: '',
    })
    expect(getCompactAppStateFromRoute({ path: '/links', query: {} })).toEqual({
      active_tab: 'links',
    })
  })

  it('should parse valid category and search query values from route query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'computer' } },
      { category_ids: ['home', 'computer'], tag_labels: [] },
    )).toEqual({
      active_tab: 'home',
      home_category_id: 'computer',
    })

    expect(getCompactAppStateFromRoute({ path: '/search', query: { q: '  機械鍵盤  ' } })).toEqual({
      active_tab: 'search',
      search_query: '機械鍵盤',
    })
  })

  it('should fallback invalid or empty query values to the route defaults', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'missing' } },
      { category_ids: ['home', 'computer'], tag_labels: [] },
    )).toEqual({
      active_tab: 'home',
      home_category_id: 'all',
    })
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: ['不存在', '影音'] } },
      { category_ids: [], tag_labels: ['影音'] },
    )).toEqual({ active_tab: 'guide' })
    expect(getCompactAppStateFromRoute({ path: '/search', query: { q: ['  ', 'ignored'] } })).toEqual({
      active_tab: 'search',
      search_query: '',
    })
  })

  it('should ignore a single guide tag delivered as a Vue Router string query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: '工作' } },
      { tag_labels: ['工作'] },
    )).toEqual({
      active_tab: 'guide',
    })
  })

  it('should ignore multiple guide tags delivered as a Vue Router array query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: ['工作', '輸入'] } },
      { tag_labels: ['工作', '輸入'] },
    )).toEqual({
      active_tab: 'guide',
    })
  })

  it('should not create a guide tag URL contract for labels containing commas', () => {
    const tag_with_comma = 'a,b'
    const selected_tags = ['a,b', 'c']
    // Vue Router serialises an array query as repeated params and parses it back to an array.
    const round_tripped_query = { tags: selected_tags }

    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: round_tripped_query },
      { tag_labels: [tag_with_comma, 'c'] },
    )).toEqual({
      active_tab: 'guide',
    })
  })
})
