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
      image_url: '/products/images/base-product.jpg',
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
      image_url: '/products/images/sample-product.jpg',
      category_label: '電腦',
      channel_id: 'pchome',
      channel_ids: ['pchome'],
      channel_label: 'PChome',
      price_label: 'NT$ 2,490',
      tag_ids: ['tag-a'],
      tag_labels: ['標籤 A'],
    })
  })

  it('should collect the channel id of every offer (deduplicated) for channel-page selection', () => {
    const product = makeProduct({
      id: 'multi-offer-product',
      status: 'published',
      name: '多通路商品',
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://example.com/pchome',
          price_text: 'NT$ 1,990',
          price: { amount: 1990, currency: 'TWD', unit: 'each', label: null },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
        {
          channel_id: 'momo',
          url: 'https://example.com/momo',
          price_text: 'NT$ 2,090',
          price: { amount: 2090, currency: 'TWD', unit: 'each', label: null },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
        {
          channel_id: 'pchome',
          url: 'https://example.com/pchome-2',
          price_text: 'NT$ 1,950',
          price: { amount: 1950, currency: 'TWD', unit: 'each', label: null },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
    })

    const fields = mapProductCardFields(product, makeResolver())

    // primary（顯示用）仍是第一個 offer 的 channel；channel_ids 帶所有 offer 的 channel、去重。
    expect(fields.channel_id).toBe('pchome')
    expect(fields.channel_ids).toEqual(['pchome', 'momo'])
  })

  it('should ignore the price label for display when it is not contained in the price text (label is metadata only)', () => {
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

    expect(mapProductCardFields(product, makeResolver()).price_label).toBe('NT$ 1,990')
  })

  it('should always return the price text for display regardless of the price label value (label is metadata only)', () => {
    const product = makeProduct({
      id: 'unrelated-label-price',
      status: 'published',
      name: '無關標籤商品',
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://example.com/buy',
          price_text: 'NT$ 1,990',
          price: { amount: null, currency: 'TWD', unit: 'each', label: '這段完全不同的 metadata' },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
    })

    expect(mapProductCardFields(product, makeResolver()).price_label).toBe('NT$ 1,990')
  })

  it('should always return the price text for display even when the price label is a prefix qualifier', () => {
    const product = makeProduct({
      id: 'qualified-price',
      status: 'published',
      name: '含價格修飾詞商品',
      offers: [
        {
          channel_id: 'amazonjp',
          url: 'https://example.com/buy',
          price_text: '約¥5000',
          price: { amount: 5000, currency: 'JPY', unit: 'each', label: '約' },
          checked_at: '2026-06-18T00:00:00+08:00',
        },
      ],
    })

    expect(mapProductCardFields(product, makeResolver()).price_label).toBe('約¥5000')
  })
})
