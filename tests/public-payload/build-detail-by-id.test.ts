import { describe, expect, it } from 'vitest'

import { buildGuideDetail, buildProductDetail } from '../../scripts/public-payload/build-detail-by-id'
import type { Guide } from '../../app/utils/product-schema'
import type { PublicContentSource } from '../../scripts/content-reader'
import { base_guide, makeProduct, test_taxonomies } from '../published-products/fixtures'

function makeOffer(channel_id: string) {
  return {
    channel_id,
    url: `https://example.com/${channel_id}`,
    price_text: 'NT$ 1,990',
    price: {
      amount: 1990,
      currency: 'TWD' as const,
      unit: 'each' as const,
      label: null,
    },
    checked_at: '2026-06-02T00:00:00+08:00',
  }
}

function makeGuide(guide: Partial<Guide> & Pick<Guide, 'id'>): Guide {
  return {
    ...base_guide,
    ...guide,
  }
}

function makeSource(overrides: Partial<PublicContentSource>): PublicContentSource {
  return {
    products: [],
    guides: [],
    links: [],
    taxonomies: test_taxonomies,
    ...overrides,
  }
}

describe('per-id product detail builder', () => {
  it('should build a single ProductDetailView keyed by content id', () => {
    const source = makeSource({
      products: [
        makeProduct({ id: 'products/wanted-product.json', status: 'published', name: '想要的商品', long_description: '完整描述' }),
      ],
    })

    const detail = buildProductDetail(source, 'wanted-product')

    expect(detail).not.toBeNull()
    expect(detail?.id).toBe('wanted-product')
    expect(detail?.long_description).toBe('完整描述')
  })

  it('should compute related products from other published products only', () => {
    const source = makeSource({
      products: [
        makeProduct({ id: 'current-product', status: 'published', name: '目前商品', category_id: 'computer', tag_ids: ['typing'], offers: [makeOffer('pchome')] }),
        makeProduct({ id: 'related-product', status: 'published', name: '相關商品', category_id: 'computer', tag_ids: ['typing'], offers: [makeOffer('momo')] }),
        makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', category_id: 'computer', tag_ids: ['typing'], offers: [makeOffer('pchome')] }),
      ],
    })

    const detail = buildProductDetail(source, 'current-product')

    expect(detail?.related_products.map((product) => product.id)).toEqual(['related-product'])
  })

  it('should return null for a missing product id (spec Case 1 → 404)', () => {
    const source = makeSource({
      products: [makeProduct({ id: 'present-product', status: 'published', name: '存在的商品' })],
    })

    expect(buildProductDetail(source, 'ghost-product')).toBeNull()
  })

  it('should return null for an unpublished product id', () => {
    const source = makeSource({
      products: [makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品' })],
    })

    expect(buildProductDetail(source, 'draft-product')).toBeNull()
  })
})

describe('per-id guide detail builder', () => {
  it('should build a single GuideDetailView keyed by content id', () => {
    const source = makeSource({
      guides: [makeGuide({ id: 'wanted-guide', status: 'published', title: '想要的指南', body: '內文' })],
    })

    const detail = buildGuideDetail(source, 'wanted-guide')

    expect(detail).not.toBeNull()
    expect(detail?.id).toBe('wanted-guide')
    expect(detail?.body).toBe('內文')
  })

  it('should compute guide related products from published products in reference order', () => {
    const source = makeSource({
      guides: [makeGuide({ id: 'related-guide', status: 'published', related_product_ids: ['second-product', 'first-product'] })],
      products: [
        makeProduct({ id: 'first-product', status: 'published', name: '第一個商品', category_id: 'computer', offers: [makeOffer('pchome')] }),
        makeProduct({ id: 'second-product', status: 'published', name: '第二個商品', category_id: 'home', offers: [makeOffer('momo')] }),
        makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', category_id: 'computer', offers: [makeOffer('pchome')] }),
      ],
    })

    const detail = buildGuideDetail(source, 'related-guide')

    expect(detail?.related_products.map((product) => product.id)).toEqual(['second-product', 'first-product'])
  })

  it('should return null for a missing guide id (spec Case 1 → 404)', () => {
    const source = makeSource({
      guides: [makeGuide({ id: 'present-guide', status: 'published', title: '存在的指南' })],
    })

    expect(buildGuideDetail(source, 'ghost-guide')).toBeNull()
  })

  it('should return null for an unpublished guide id', () => {
    const source = makeSource({
      guides: [makeGuide({ id: 'draft-guide', status: 'draft', title: '草稿指南' })],
    })

    expect(buildGuideDetail(source, 'draft-guide')).toBeNull()
  })
})
