import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

import {
  getCatalogProductId,
  getCatalogSearchProducts,
  getCatalogView,
  getGroupedPublishedProducts,
  getPublishedProducts,
} from '../app/utils/published-products'
import type { Product } from '../app/utils/product-schema'

const products_dir_url = new URL('../content/products/', import.meta.url)

const base_product = {
  price_text: 'NT$ 1,990',
  description: '推薦文',
  purchase_url: 'https://example.com/product',
  image_url: 'https://example.com/product.jpg',
  category: '未分類',
  tags: ['tag-a'],
  reference_url: null,
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
} satisfies Omit<Product, 'id' | 'status' | 'name'>

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
        category: '鍵盤',
      }),
    ]

    const published_products = getPublishedProducts(products)

    expect(published_products).toEqual([
      {
        id: 'published-product',
        category: '鍵盤',
        description: '推薦文',
        image: 'https://example.com/image.jpg',
        name: '已上架商品',
        price: 'NT$ 2,490',
        published_at: '2026-06-02T00:00:00+08:00',
        purchase_link: 'https://example.com/buy',
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
        category: '滑鼠',
        published_at: '2026-06-04T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-old',
        status: 'published',
        name: '鍵盤舊品',
        category: '鍵盤',
        published_at: '2026-06-01T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-new',
        status: 'published',
        name: '鍵盤新品',
        category: '鍵盤',
        published_at: '2026-06-03T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-draft',
        status: 'draft',
        name: '鍵盤草稿',
        category: '鍵盤',
        published_at: '2026-06-05T00:00:00+08:00',
      }),
    ]

    const grouped_products = getGroupedPublishedProducts(products)

    expect(grouped_products).toEqual([
      {
        category: '滑鼠',
        products: [expect.objectContaining({ id: 'mouse-new' })],
      },
      {
        category: '鍵盤',
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
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', category: '鍵盤', tags: ['typing'] }),
      makeProduct({ id: 'mouse', status: 'published', name: '無線滑鼠', category: '滑鼠', tags: ['wireless'] }),
      makeProduct({ id: 'draft-keyboard', status: 'draft', name: '草稿鍵盤', category: '鍵盤', tags: ['draft'] }),
    ]

    const catalog_view = getCatalogView(products)

    expect(catalog_view.counts).toEqual({ published: 2, filtered: 2 })
    expect(catalog_view.products.map((product) => product.id)).toEqual(['mouse', 'keyboard'])
    expect(catalog_view.sections).toEqual([
      {
        category: '滑鼠',
        products: [expect.objectContaining({ id: 'mouse' })],
      },
      {
        category: '鍵盤',
        products: [expect.objectContaining({ id: 'keyboard' })],
      },
    ])
    expect(catalog_view.category_options).toEqual([
      { label: '全部', value: '全部', count: 2, active: true },
      { label: '滑鼠', value: '滑鼠', count: 1, active: false },
      { label: '鍵盤', value: '鍵盤', count: 1, active: false },
    ])
    expect(catalog_view.sort_options).toEqual([
      { label: '預設排序', value: 'default', active: true },
      { label: '最新上架', value: 'latest', active: false },
      { label: '名稱排序', value: 'name', active: false },
    ])
    expect(catalog_view.empty_reason).toBeNull()
  })

  it('should filter by category without counting non-published products', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', category: '鍵盤' }),
      makeProduct({ id: 'mouse', status: 'published', name: '無線滑鼠', category: '滑鼠' }),
      makeProduct({ id: 'draft-mouse', status: 'draft', name: '草稿滑鼠', category: '滑鼠' }),
    ]

    const catalog_view = getCatalogView(products, { category: '滑鼠' })

    expect(catalog_view.products.map((product) => product.id)).toEqual(['mouse'])
    expect(catalog_view.sections).toEqual([
      {
        category: '滑鼠',
        products: [expect.objectContaining({ id: 'mouse' })],
      },
    ])
    expect(catalog_view.category_options.find((option) => option.value === '滑鼠')).toEqual({
      label: '滑鼠',
      value: '滑鼠',
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
        category: '鍵盤',
        published_at: '2026-06-01T00:00:00+08:00',
      }),
      makeProduct({
        id: 'mouse-new',
        status: 'published',
        name: 'C 滑鼠',
        category: '滑鼠',
        published_at: '2026-06-04T00:00:00+08:00',
      }),
      makeProduct({
        id: 'keyboard-new',
        status: 'published',
        name: 'A 鍵盤',
        category: '鍵盤',
        published_at: '2026-06-03T00:00:00+08:00',
      }),
    ]

    expect(getCatalogView(products, { sort: 'default' }).products.map((product) => product.id)).toEqual([
      'mouse-new',
      'keyboard-new',
      'keyboard-old',
    ])
    expect(getCatalogView(products, { sort: 'latest' }).products.map((product) => product.id)).toEqual([
      'mouse-new',
      'keyboard-new',
      'keyboard-old',
    ])
    expect(getCatalogView(products, { sort: 'name' }).products.map((product) => product.id)).toEqual([
      'keyboard-new',
      'keyboard-old',
      'mouse-new',
    ])
    expect(getCatalogView(products, { sort: 'category' }).products.map((product) => product.id)).toEqual([
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
      category: index === 12 ? '第十三分類' : '前段分類',
      published_at: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00+08:00`,
    }))
    const complete_search_results = products.map((product) => ({ id: product.id }))

    const search_products = getCatalogSearchProducts(products, complete_search_results, '共同關鍵字')
    const catalog_view = getCatalogView(search_products, { category: '第十三分類' })

    expect(search_products).toHaveLength(13)
    expect(catalog_view.products.map((product) => product.id)).toEqual(['product-13'])
  })

  it('should treat empty query as no query and keep the current category and sort state', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', category: '鍵盤' }),
      makeProduct({ id: 'mouse', status: 'published', name: '無線滑鼠', category: '滑鼠' }),
    ]

    const catalog_view = getCatalogView(products, { query: '   ', category: '鍵盤', sort: 'name' })

    expect(catalog_view.query).toBe('')
    expect(catalog_view.category).toBe('鍵盤')
    expect(catalog_view.sort).toBe('name')
    expect(catalog_view.products.map((product) => product.id)).toEqual(['keyboard'])
    expect(catalog_view.empty_reason).toBeNull()
  })

  it('should return an empty-result reason when filters match no published product', () => {
    const products = [
      makeProduct({ id: 'keyboard', status: 'published', name: '機械鍵盤', description: '打字用', category: '鍵盤' }),
      makeProduct({ id: 'draft-monitor', status: 'draft', name: '4K 螢幕', description: '影像用', category: '螢幕' }),
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
