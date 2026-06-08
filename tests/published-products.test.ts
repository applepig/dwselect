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
  getGroupedPublishedProducts,
  getProductDetail,
  getPublishedProducts,
} from '../app/utils/published-products'
import type { LinkDefinition } from '../app/utils/product-schema'
import type { Product } from '../app/utils/product-schema'

const products_dir_url = new URL('../content/products/', import.meta.url)

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
  tags: ['tag-a'],
  reference_url: null,
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
} satisfies Omit<Product, 'id' | 'status' | 'name'>

const test_taxonomies: TaxonomyDefinitions = {
  categories: [
    { id: 'home', label: '居家', short_label: '居家', sort_order: 10 },
    { id: 'kitchen', label: '廚房', short_label: '廚房', sort_order: 20 },
    { id: 'computer', label: '電腦', short_label: '電腦', sort_order: 30 },
    { id: 'three-c', label: '3C', short_label: '3C', sort_order: 40 },
    { id: 'av', label: '影音', short_label: '影音', sort_order: 50 },
    { id: 'food', label: '食材', short_label: '食材', sort_order: 60 },
    { id: 'other', label: '其他', short_label: '其他', sort_order: 999 },
  ],
  channels: [
    { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
    { id: 'momo', label: 'momo', tint: 'pink', host_patterns: ['www.momoshop.com.tw'], sort_order: 20 },
    { id: 'amazonjp', label: 'Amazon JP', tint: 'amber', host_patterns: ['www.amazon.co.jp', 'amzn.asia'], sort_order: 30 },
    { id: 'amazonus', label: 'Amazon US', tint: 'amber', host_patterns: ['www.amazon.com'], sort_order: 40 },
    { id: 'costco', label: 'Costco', tint: 'indigo', host_patterns: ['www.costco.com.tw'], sort_order: 50 },
    { id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 999 },
  ],
}

const test_links: LinkDefinition[] = [
  {
    id: 'applepig-home',
    title: 'applepig.idv.tw',
    subtitle: 'DW 的主站',
    url: 'https://applepig.idv.tw',
    icon: 'i-lucide-link',
    sort_order: 10,
  },
]

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
        tags: ['tag-a'],
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
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', category_id: 'computer', tags: ['typing'] }),
      makeProduct({ id: 'mouse', status: 'published', name: '無線滑鼠', category_id: 'home', tags: ['wireless'] }),
      makeProduct({ id: 'draft-keyboard', status: 'draft', name: '草稿鍵盤', category_id: 'computer', tags: ['draft'] }),
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
      { label: '電腦', value: 'computer', count: 1, active: false },
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

    expect(catalog_view.category_options.map((option) => option.label)).toEqual(['全部', '居家', '廚房', '食材'])
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
        tags: [long_tag],
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

describe('published product cutover content', () => {
  it('should expose 66 real published products without the sample product', () => {
    const catalog_view = getCatalogView(readContentProducts())

    expect(catalog_view.counts).toEqual({ published: 66, filtered: 66 })
    expect(catalog_view.products.map((product) => product.id)).not.toContain('2026-06-02-sample-product')
    expect(catalog_view.products).toContainEqual(expect.objectContaining({
      id: '2026-06-02-sharp-65吋-xled',
      name: 'Sharp 65吋 XLED',
      category: '影音',
      category_id: 'av',
      channel: 'PChome',
      channel_id: 'pchome',
      tags: ['電視', '影音', 'PCHome'],
    }))
  })

  it('should search real product names, categories and tags from the cutover content', () => {
    const products = readContentProducts()

    expect(getCatalogView(products, { query: 'Sharp 65吋 XLED' }).products).toContainEqual(expect.objectContaining({
      id: '2026-06-02-sharp-65吋-xled',
    }))
    expect(getCatalogView(products, { query: '影音' }).products.length).toBeGreaterThan(0)
    expect(getCatalogView(products, { query: 'PCHome' }).products.length).toBeGreaterThan(0)
  })
})

describe('compact app view state', () => {
  function getCompactView(products: Product[], state: CompactAppState = {}) {
    return getCompactAppView(products, state, test_taxonomies, test_links)
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

  it('should AND-filter guide products by selected tags and expose clear state', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '鍵盤', category_id: 'computer', tags: ['工作', '輸入'] }),
      makeProduct({ id: 'monitor', status: 'published', name: '螢幕', category_id: 'computer', tags: ['工作', '影音'] }),
      makeProduct({ id: 'speaker', status: 'published', name: '喇叭', category_id: 'av', tags: ['影音'] }),
    ]

    const compact_view = getCompactView(products, { selected_tags: ['工作', '輸入'] })

    expect(compact_view.guide.selected_tags).toEqual(['工作', '輸入'])
    expect(compact_view.guide.products.map((product) => product.id)).toEqual(['keyboard'])
    expect(compact_view.guide.can_clear_tags).toBe(true)
    expect(compact_view.guide.empty_reason).toBeNull()
  })

  it('should expose top tags ordered by usage and label', () => {
    const products = [
      makeProduct({ id: 'one', status: 'published', name: '一號', tags: ['影音', '工作'] }),
      makeProduct({ id: 'two', status: 'published', name: '二號', tags: ['影音', '居家'] }),
      makeProduct({ id: 'three', status: 'published', name: '三號', tags: ['工作'] }),
    ]

    const compact_view = getCompactView(products)

    expect(compact_view.top_tags).toEqual([
      { label: '工作', count: 2, active: false },
      { label: '影音', count: 2, active: false },
      { label: '居家', count: 1, active: false },
    ])
  })

  it('should filter search tab by query and expose empty and no-results states', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '打字工作用', tags: ['輸入'] }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', summary: '影音用', category_id: 'av', tags: ['影音'] }),
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

  it('should fallback to loaded Nuxt Content products when the client search index fails', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', summary: '打字工作用', tags: ['輸入'] }),
      makeProduct({ id: 'speaker', status: 'published', name: '桌上喇叭', summary: '影音用', category_id: 'av', tags: ['影音'] }),
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

  it('should expose the links panel data with safe external link attributes', () => {
    const compact_view = getCompactView([])

    expect(compact_view.links).toEqual([
      {
        id: 'applepig-home',
        title: 'applepig.idv.tw',
        subtitle: 'DW 的主站',
        url: 'https://applepig.idv.tw',
        icon: 'i-lucide-link',
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
      tags: ['超長 tag 名稱'.repeat(6), '影音'],
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
      tags: product.tags,
      buy_cta: {
        label: '到 PChome 購買',
        href: 'https://24h.pchome.com.tw/prod/detail',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      fine_print: '價格與庫存以通路頁面為準。',
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
      selected_tags: [],
    })
    expect(getCompactAppStateFromRoute({ path: '/search', query: {} })).toEqual({
      active_tab: 'search',
      search_query: '',
    })
    expect(getCompactAppStateFromRoute({ path: '/links', query: {} })).toEqual({
      active_tab: 'links',
    })
  })

  it('should parse valid category, tag and search query values from route query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/', query: { category: 'computer' } },
      { category_ids: ['home', 'computer'], tag_labels: [] },
    )).toEqual({
      active_tab: 'home',
      home_category_id: 'computer',
    })

    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: [' 工作 ', '輸入', '不存在', '', '工作'] } },
      { category_ids: [], tag_labels: ['工作', '輸入'] },
    )).toEqual({
      active_tab: 'guide',
      selected_tags: ['工作', '輸入'],
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
    )).toEqual({
      active_tab: 'guide',
      selected_tags: ['影音'],
    })
    expect(getCompactAppStateFromRoute({ path: '/search', query: { q: ['  ', 'ignored'] } })).toEqual({
      active_tab: 'search',
      search_query: '',
    })
  })

  it('should accept a single tag delivered as a Vue Router string query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: '工作' } },
      { tag_labels: ['工作'] },
    )).toEqual({
      active_tab: 'guide',
      selected_tags: ['工作'],
    })
  })

  it('should accept multiple tags delivered as a Vue Router array query', () => {
    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: { tags: ['工作', '輸入'] } },
      { tag_labels: ['工作', '輸入'] },
    )).toEqual({
      active_tab: 'guide',
      selected_tags: ['工作', '輸入'],
    })
  })

  it('should round-trip a tag whose label contains a comma without splitting it', () => {
    const tag_with_comma = 'a,b'
    const selected_tags = ['a,b', 'c']
    // Vue Router serialises an array query as repeated params and parses it back to an array.
    const round_tripped_query = { tags: selected_tags }

    expect(getCompactAppStateFromRoute(
      { path: '/guide', query: round_tripped_query },
      { tag_labels: [tag_with_comma, 'c'] },
    )).toEqual({
      active_tab: 'guide',
      selected_tags: ['a,b', 'c'],
    })
  })
})
