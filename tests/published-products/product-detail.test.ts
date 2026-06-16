import { describe, expect, it } from 'vitest'

import { getProductDetail, getRelatedProductCards } from '../../app/utils/published-products/product-detail'
import { getProductDetailPayload } from '../../app/utils/published-products/product-detail-payload'
import { makeProduct, test_taxonomies } from './fixtures'

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

describe('product detail mapping', () => {
  it('should expose product detail fields, buy CTA and safe external attributes', () => {
    const product = makeProduct({
      id: 'products/products/detail-product.json',
      status: 'published',
      name: '很長很長的商品名稱'.repeat(6),
      summary: 'DW 怎麼說要保留原始短評'.repeat(4),
      long_description: '細節說明可以比卡片更長',
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

    const detail = getProductDetail(product, test_taxonomies)

    expect(detail).toEqual({
      id: 'detail-product',
      title: product.name,
      hero_image: '/images/products/detail.webp',
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
      long_description: '同一段推薦文字',
    })

    const detail = getProductDetail(product, test_taxonomies)

    expect(detail.dw_says).toBe('同一段推薦文字')
    expect(detail.description).toBeNull()
    expect(detail.related_products).toEqual([])
  })

  it('should resolve local product image files for detail hero image', () => {
    const product = makeProduct({
      id: 'local-detail-product',
      status: 'published',
      name: '本地詳情商品',
      image_file: 'local-detail-product.avif',
      image_url: null,
    })

    const detail = getProductDetail(product, test_taxonomies)

    expect(detail.hero_image).toBe('/images/products/local-detail-product.webp')
  })

  it('should reject external-only product images for detail hero image', () => {
    const product = makeProduct({
      id: 'external-detail-product',
      status: 'published',
      name: '外部圖片詳情商品',
      image_file: null,
      image_url: 'https://example.com/detail.jpg',
    })

    expect(() => getProductDetail(product, test_taxonomies)).toThrow('Published product image_file is required')
  })

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
        id: 'different-category-two-tags-new',
        status: 'published',
        name: '不同分類兩個標籤較新',
        category_id: 'home',
        offers: [makeOffer('pchome')],
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-06T00:00:00+08:00',
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

    const detail = getProductDetail(product, taxonomies)

    expect(detail.tags).toEqual(['輸入', 'Fixture Brand'])
  })

  it('should build a product detail payload without serializing raw catalog records for other products', () => {
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
      long_description: '不應出現在 payload 的相關商品 raw long_description',
      offers: [makeOffer('momo')],
    })
    const unrelated_product = makeProduct({
      id: 'unrelated-product',
      status: 'published',
      name: '其他商品',
      category_id: 'home',
      tag_ids: ['tag-a'],
      long_description: '不應出現在 payload 的其他商品 raw long_description',
      offers: [
        {
          ...makeOffer('pchome'),
          url: 'https://example.com/unrelated-raw-offer',
        },
      ],
    })
    const content_payload = {
      version: 1,
      site: {
        name: 'DW嚴選',
        url: 'https://dwselect.applepig.net/',
      },
      products: [current_product, related_product, unrelated_product],
      guides: [],
      links: [],
      taxonomies: test_taxonomies,
    } as const

    const detail_payload = getProductDetailPayload(content_payload, 'current-product')
    const serialized_payload = JSON.stringify(detail_payload)

    expect(detail_payload?.product_detail.id).toBe('current-product')
    expect(detail_payload?.product_detail.related_products.map((product) => product.id)).toEqual([
      'related-product',
      'unrelated-product',
    ])
    expect(serialized_payload).toContain('目前商品完整描述')
    expect(serialized_payload).not.toContain('不應出現在 payload 的相關商品 raw long_description')
    expect(serialized_payload).not.toContain('不應出現在 payload 的其他商品 raw long_description')
    expect(serialized_payload).not.toContain('unrelated-raw-offer')
    expect(serialized_payload).not.toContain('"offers"')
    expect(serialized_payload).not.toContain('"products"')
  })

  it('should limit related product cards in the product detail payload', () => {
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
    const content_payload = {
      version: 1,
      site: {
        name: 'DW嚴選',
        url: 'https://dwselect.applepig.net/',
      },
      products: [current_product, ...related_products],
      guides: [],
      links: [],
      taxonomies: test_taxonomies,
    } as const

    const detail_payload = getProductDetailPayload(content_payload, 'current-product')

    expect(detail_payload?.product_detail.related_products.map((product) => product.id)).toEqual([
      'related-product-5',
      'related-product-4',
      'related-product-3',
    ])
  })

  it('should return null when the product id is not in the public content payload', () => {
    const content_payload = {
      version: 1,
      site: {
        name: 'DW嚴選',
        url: 'https://dwselect.applepig.net/',
      },
      products: [makeProduct({ id: 'current-product', status: 'published', name: '目前商品' })],
      guides: [],
      links: [],
      taxonomies: test_taxonomies,
    } as const

    expect(getProductDetailPayload(content_payload, 'missing-product')).toBeNull()
  })
})
