import { describe, expect, it } from 'vitest'

import { mapProductCard } from '../../scripts/public-payload/map-product-card'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import { makeProduct, test_taxonomies } from '../published-products/fixtures'

function makeResolver(taxonomies = test_taxonomies) {
  return createTaxonomyLabelResolver(taxonomies)
}

describe('product card build mapper', () => {
  it('should map a product to semantic card fields without legacy TSV names', () => {
    const product = makeProduct({
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
      image_file: 'published-product.jpg',
      image_url: null,
      category_id: 'computer',
      summary: '卡片短評',
    })

    const card = mapProductCard(product, makeResolver())

    expect(card).toEqual({
      id: 'published-product',
      name: '已上架商品',
      summary: '卡片短評',
      image_url: '/products/images/published-product.jpg',
      category_id: 'computer',
      category_label: '電腦',
      channel_id: 'pchome',
      channel_label: 'PChome',
      price_label: 'NT$ 2,490',
      tag_labels: ['標籤 A'],
      published_at: '2026-06-02T00:00:00+08:00',
    })
    expect(card).not.toHaveProperty('description')
    expect(card).not.toHaveProperty('long_description')
    expect(card).not.toHaveProperty('purchase_link')
    expect(card).not.toHaveProperty('image')
  })

  it('should use price label over price text when an offer provides a labelled price', () => {
    const product = makeProduct({
      id: 'labelled-price-product',
      status: 'published',
      name: '標價商品',
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://example.com/buy',
          price_text: 'NT$ 1,990',
          price: {
            amount: null,
            currency: 'TWD',
            unit: 'each',
            label: 'NT$ 1,990 起',
          },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
    })

    expect(mapProductCard(product, makeResolver()).price_label).toBe('NT$ 1,990 起')
  })

  it('should resolve local product image files for cards', () => {
    const product = makeProduct({
      id: 'local-image-product',
      status: 'published',
      name: '本地圖片商品',
      image_file: 'local-image-product.webp',
      image_url: null,
    })

    expect(mapProductCard(product, makeResolver()).image_url).toBe('/products/images/local-image-product.webp')
  })

  it('should reject external-only product images for cards', () => {
    const product = makeProduct({
      id: 'external-image-product',
      status: 'published',
      name: '外部圖片商品',
      image_file: null,
      image_url: 'https://example.com/image.jpg',
    })

    expect(() => mapProductCard(product, makeResolver())).toThrow('Published product image_file is required')
  })

  it('should normalize quote-wrapped local product image files for cards', () => {
    const product = makeProduct({
      id: 'quote-wrapped-image-product',
      status: 'published',
      name: '引號圖片商品',
      image_file: '"quote-wrapped-image-product.jpg"',
      image_url: null,
    })

    expect(mapProductCard(product, makeResolver()).image_url).toBe('/products/images/quote-wrapped-image-product.jpg')
  })

  it('should normalize Nuxt Content runtime ids to canonical product ids', () => {
    const product = makeProduct({
      id: 'products/products/2026-06-02-sample-product.json',
      status: 'published',
      name: '範例商品',
    })

    expect(mapProductCard(product, makeResolver()).id).toBe('2026-06-02-sample-product')
  })

  it('should resolve product tag labels from taxonomy tags and brands', () => {
    const product = makeProduct({
      id: 'branded-product',
      status: 'published',
      name: '品牌商品',
      tag_ids: ['tag-a', 'fixture-brand'],
    })
    const taxonomies = {
      ...test_taxonomies,
      brands: [
        { id: 'fixture-brand', label: 'Fixture Brand', description: '測試品牌', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    }

    expect(mapProductCard(product, makeResolver(taxonomies)).tag_labels).toEqual(['標籤 A', 'Fixture Brand'])
  })
})
