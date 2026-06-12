import { describe, expect, it } from 'vitest'

import { getPublishedProducts } from '../../app/utils/published-products/shared'
import { getCatalogProductId } from '../../app/utils/published-products/product-detail'
import { makeProduct, test_taxonomies } from './fixtures'

describe('published products mapping', () => {
  it('should return only products with published status', () => {
    const products = [
      makeProduct({ id: 'published-product', status: 'published', name: '已上架商品' }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品' }),
      makeProduct({ id: 'unpublished-product', status: 'unpublished', name: '已下架商品' }),
      makeProduct({ id: 'archived-product', status: 'archived', name: '封存商品' }),
    ]

    const published_products = getPublishedProducts(products, test_taxonomies)

    expect(published_products).toHaveLength(1)
    expect(published_products[0]?.name).toBe('已上架商品')
  })

  it('should map published products to card fields without legacy TSV names', () => {
    const products = [
      makeProduct({
        id: 'published-product',
        status: 'published',
        name: '已上架商品',
        offers: [
          {
            channel_id: 'pchome',
            url: 'https://example.com/buy',
            price_text: 'NT$ 2,490',
            price: {
              amount: 2490,
              currency: 'TWD',
              unit: 'each',
              label: null,
            },
            checked_at: '2026-06-02T00:00:00+08:00',
          },
        ],
        image_url: 'https://example.com/image.jpg',
        category_id: 'computer',
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

  it('should normalize Nuxt Content runtime ids to canonical product ids', () => {
    const product = makeProduct({
      id: 'products/products/2026-06-02-sample-product.json',
      status: 'published',
      name: '範例商品',
    })

    expect(getCatalogProductId(product)).toBe('2026-06-02-sample-product')
    expect(getPublishedProducts([product], test_taxonomies)).toEqual([
      expect.objectContaining({ id: '2026-06-02-sample-product' }),
    ])
  })

  it('should resolve product tag labels from taxonomy tags and brands', () => {
    const products = [
      makeProduct({
        id: 'branded-product',
        status: 'published',
        name: '品牌商品',
        tag_ids: ['tag-a', 'fixture-brand'],
      }),
    ]
    const taxonomies = {
      ...test_taxonomies,
      brands: [
        { id: 'fixture-brand', label: 'Fixture Brand', description: '測試品牌', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    }

    const published_products = getPublishedProducts(products, taxonomies)

    expect(published_products[0]?.tags).toEqual(['標籤 A', 'Fixture Brand'])
  })
})
