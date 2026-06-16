import { describe, expect, it } from 'vitest'

import { mapProductDetail } from '../../scripts/public-payload/map-product-detail'
import { getRelatedProductCards } from '../../scripts/public-payload/map-related-product-card'
import { buildPublicContentPayload } from '../../scripts/public-content'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import { makeProduct, test_taxonomies } from '../published-products/fixtures'

function makeResolver(taxonomies = test_taxonomies) {
  return createTaxonomyLabelResolver(taxonomies)
}

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

function makePayload(products: ReturnType<typeof makeProduct>[]) {
  return buildPublicContentPayload({
    products,
    guides: [],
    links: [],
    taxonomies: test_taxonomies,
  })
}

describe('product detail build mapper', () => {
  it('should expose product detail content semantics without dw_says or generic description', () => {
    const product = makeProduct({
      id: 'products/products/detail-product.json',
      status: 'published',
      name: '很長很長的商品名稱'.repeat(6),
      summary: 'DW 怎麼說要保留原始短評'.repeat(4),
      long_description: '細節說明可以比卡片更長',
      llm_description: 'AI 觀點',
      offers: [
        {
          channel_id: 'pchome',
          url: 'https://24h.pchome.com.tw/prod/detail',
          price_text: 'NT$ 123,456,789 起',
          price: {
            amount: null,
            currency: 'TWD',
            unit: 'each',
            label: 'NT$ 123,456,789 起',
          },
          checked_at: '2026-06-02T00:00:00+08:00',
        },
      ],
      image_file: 'detail.jpg',
      image_url: null,
      category_id: 'av',
      tag_ids: ['超長 tag 名稱'.repeat(6), '影音'],
    })

    const detail = mapProductDetail(product, [product], makeResolver())

    expect(detail).toEqual({
      id: 'detail-product',
      name: product.name,
      summary: product.summary,
      long_description: '細節說明可以比卡片更長',
      llm_description: 'AI 觀點',
      hero_image_url: '/images/products/detail.webp',
      hero_alt: product.name,
      category_id: 'av',
      category_label: '影音',
      channel_id: 'pchome',
      channel_label: 'PChome',
      tag_labels: product.tag_ids,
      price_label: 'NT$ 123,456,789 起',
      buy_url: 'https://24h.pchome.com.tw/prod/detail',
      fine_print: '價格與庫存以通路頁面為準。',
      related_products: [],
    })
  })

  it('should keep long_description as the original value even when it equals summary', () => {
    const product = makeProduct({
      id: 'duplicated-description-product',
      status: 'published',
      name: '重複文案商品',
      summary: '同一段推薦文字',
      long_description: '同一段推薦文字',
      llm_description: '',
    })

    const detail = mapProductDetail(product, [product], makeResolver())

    expect(detail.summary).toBe('同一段推薦文字')
    expect(detail.long_description).toBe('同一段推薦文字')
    expect(detail.llm_description).toBe('')
  })

  it('should resolve local product image files for detail hero image', () => {
    const product = makeProduct({
      id: 'local-detail-product',
      status: 'published',
      name: '本地詳情商品',
      image_file: 'local-detail-product.avif',
      image_url: null,
    })

    expect(mapProductDetail(product, [product], makeResolver()).hero_image_url).toBe('/images/products/local-detail-product.webp')
  })

  it('should reject external-only product images for detail hero image', () => {
    const product = makeProduct({
      id: 'external-detail-product',
      status: 'published',
      name: '外部圖片詳情商品',
      image_file: null,
      image_url: 'https://example.com/detail.jpg',
    })

    expect(() => mapProductDetail(product, [product], makeResolver())).toThrow('Published product image_file is required')
  })

  it('should resolve product detail tag labels from taxonomy tags and brands', () => {
    const product = makeProduct({
      id: 'brand-detail-product',
      status: 'published',
      name: '品牌詳情商品',
      tag_ids: ['typing', 'fixture-brand'],
    })
    const taxonomies = {
      ...test_taxonomies,
      brands: [
        { id: 'fixture-brand', label: 'Fixture Brand', description: '測試品牌', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    }

    expect(mapProductDetail(product, [product], makeResolver(taxonomies)).tag_labels).toEqual(['輸入', 'Fixture Brand'])
  })
})

describe('related product build mapper', () => {
  it('should sort related products deterministically and exclude the current product', () => {
    const current_product = makeProduct({
      id: 'current-product',
      status: 'published',
      name: '目前商品',
      category_id: 'computer',
      offers: [makeOffer('pchome')],
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
        offers: [makeOffer('momo')],
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-01T00:00:00+08:00',
      }),
      makeProduct({
        id: 'same-category-one-tag-same-channel-old',
        status: 'published',
        name: '同分類同通路較舊',
        category_id: 'computer',
        offers: [makeOffer('pchome')],
        tag_ids: ['typing'],
        published_at: '2026-06-02T00:00:00+08:00',
      }),
      makeProduct({
        id: 'same-category-one-tag-new',
        status: 'published',
        name: '同分類較新',
        category_id: 'computer',
        offers: [makeOffer('momo')],
        tag_ids: ['typing'],
        published_at: '2026-06-04T00:00:00+08:00',
      }),
      makeProduct({
        id: 'draft-related',
        status: 'draft',
        name: '草稿推薦',
        category_id: 'computer',
        offers: [makeOffer('pchome')],
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-07T00:00:00+08:00',
      }),
    ]

    const related = getRelatedProductCards(current_product, products, createTaxonomyLabelResolver(test_taxonomies))

    expect(related.map((product) => product.id)).toEqual([
      'same-category-two-tags-old',
      'same-category-one-tag-same-channel-old',
      'same-category-one-tag-new',
    ])
  })

  it('should expose related product cards with only the related semantic keys', () => {
    const current_product = makeProduct({
      id: 'current-product',
      status: 'published',
      name: '目前商品',
      category_id: 'computer',
      tag_ids: ['typing'],
    })
    const related_product = makeProduct({
      id: 'related-product',
      status: 'published',
      name: '相關商品',
      category_id: 'computer',
      tag_ids: ['typing'],
      offers: [makeOffer('momo')],
    })

    const related = getRelatedProductCards(current_product, [current_product, related_product], createTaxonomyLabelResolver(test_taxonomies))

    expect(related).toEqual([
      {
        id: 'related-product',
        name: '相關商品',
        image_url: '/images/products/sample-product.webp',
        category_label: '電腦',
        channel_label: 'momo',
      },
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
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', category_id: 'computer' }),
    ]

    expect(getRelatedProductCards(current_product, products, createTaxonomyLabelResolver(test_taxonomies))).toEqual([])
  })
})

describe('details_by_id assembly', () => {
  it('should key details by content id without serializing raw catalog records for other products', () => {
    const current_product = makeProduct({
      id: 'current-product',
      status: 'published',
      name: '目前商品',
      category_id: 'computer',
      tag_ids: ['typing'],
      long_description: '目前商品完整描述',
    })
    const related_product = makeProduct({
      id: 'related-product',
      status: 'published',
      name: '相關商品',
      category_id: 'computer',
      tag_ids: ['typing'],
      long_description: '不應出現在 related card 的相關商品 raw long_description',
      offers: [makeOffer('momo')],
    })

    const payload = makePayload([current_product, related_product])
    const detail = payload.products.details_by_id['current-product']!

    expect(detail.id).toBe('current-product')
    expect(detail.long_description).toBe('目前商品完整描述')
    expect(detail.related_products.map((product) => product.id)).toEqual(['related-product'])
    expect(JSON.stringify(detail.related_products)).not.toContain('不應出現在 related card')
    expect(JSON.stringify(detail.related_products)).not.toContain('"offers"')
  })

  it('should limit related product cards to three', () => {
    const current_product = makeProduct({
      id: 'current-product',
      status: 'published',
      name: '目前商品',
      category_id: 'computer',
      tag_ids: ['typing'],
    })
    const related_products = Array.from({ length: 5 }, (_, index) => makeProduct({
      id: `related-product-${index + 1}`,
      status: 'published',
      name: `相關商品 ${index + 1}`,
      category_id: 'computer',
      tag_ids: ['typing'],
      published_at: `2026-06-0${index + 1}T00:00:00+08:00`,
    }))

    const payload = makePayload([current_product, ...related_products])

    expect(payload.products.details_by_id['current-product']!.related_products.map((product) => product.id)).toEqual([
      'related-product-5',
      'related-product-4',
      'related-product-3',
    ])
  })

  it('should not create a detail entry for a missing product id', () => {
    const payload = makePayload([makeProduct({ id: 'current-product', status: 'published', name: '目前商品' })])

    expect(payload.products.details_by_id['missing-product']).toBeUndefined()
  })
})
