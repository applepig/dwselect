import { describe, expect, it } from 'vitest'

import { getGroupedPublishedProducts, getPublishedProducts } from '../app/utils/published-products'
import type { Product } from '../app/utils/product-schema'

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
        image: 'https://example.com/image.jpg',
        name: '已上架商品',
        price: 'NT$ 2,490',
        purchase_link: 'https://example.com/buy',
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
})
