import { describe, expect, it } from 'vitest'

import { mapProductCardBase, mapProductCardFields } from '../../scripts/public-payload/map-product-card-fields'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import { makeProduct, test_taxonomies } from '../published-products/fixtures'

function makeResolver(taxonomies = test_taxonomies) {
  return createTaxonomyLabelResolver(taxonomies)
}

describe('product card base mapper', () => {
  it('should derive only the fields shared by every product card shape', () => {
    const product = makeProduct({
      id: 'products/products/base-product.json',
      status: 'published',
      name: '共通欄位商品',
      image_file: 'base-product.jpg',
      image_url: null,
      category_id: 'computer',
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://example.com/buy',
          price_text: 'NT$ 2,490',
          price: { amount: 2490, currency: 'TWD', unit: 'each', label: null },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
    })

    expect(mapProductCardBase(product, makeResolver())).toEqual({
      id: 'base-product',
      name: '共通欄位商品',
      image_url: '/images/products/base-product.webp',
      category_label: '電腦',
      channel_label: 'PChome',
    })
  })
})

describe('product card fields mapper', () => {
  it('should extend the base fields with the card and detail shared subset', () => {
    const product = makeProduct({
      id: 'fields-product',
      status: 'published',
      name: '卡片詳情共用商品',
      category_id: 'computer',
      tag_ids: ['tag-a'],
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://example.com/buy',
          price_text: 'NT$ 2,490',
          price: { amount: 2490, currency: 'TWD', unit: 'each', label: null },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
    })

    expect(mapProductCardFields(product, makeResolver())).toEqual({
      id: 'fields-product',
      name: '卡片詳情共用商品',
      image_url: '/images/products/sample-product.webp',
      category_label: '電腦',
      channel_id: 'pchome',
      channel_label: 'PChome',
      price_label: 'NT$ 2,490',
      tag_labels: ['標籤 A'],
    })
  })

  it('should prefer the labelled price over price text', () => {
    const product = makeProduct({
      id: 'labelled-price',
      status: 'published',
      name: '標價商品',
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://example.com/buy',
          price_text: 'NT$ 1,990',
          price: { amount: null, currency: 'TWD', unit: 'each', label: 'NT$ 1,990 起' },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
    })

    expect(mapProductCardFields(product, makeResolver()).price_label).toBe('NT$ 1,990 起')
  })
})
