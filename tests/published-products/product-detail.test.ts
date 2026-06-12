import { describe, expect, it } from 'vitest'

import { getProductDetail, getRelatedProductCards } from '../../app/utils/published-products/product-detail'
import { makeProduct, test_taxonomies } from './fixtures'

describe('product detail mapping', () => {
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
      tag_ids: ['超長 tag 名稱'.repeat(6), '影音'],
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
      description: '同一段推薦文字',
    })

    const detail = getProductDetail(product, test_taxonomies)

    expect(detail.dw_says).toBe('同一段推薦文字')
    expect(detail.description).toBeNull()
    expect(detail.related_products).toEqual([])
  })

  it('should sort related products deterministically and exclude the current product', () => {
    const current_product = makeProduct({
      id: 'current-product',
      status: 'published',
      name: '目前商品',
      category_id: 'computer',
      channel_id: 'pchome',
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
        channel_id: 'momo',
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-01T00:00:00+08:00',
      }),
      makeProduct({
        id: 'same-category-one-tag-same-channel-old',
        status: 'published',
        name: '同分類同通路較舊',
        category_id: 'computer',
        channel_id: 'pchome',
        tag_ids: ['typing'],
        published_at: '2026-06-02T00:00:00+08:00',
      }),
      makeProduct({
        id: 'same-category-one-tag-new',
        status: 'published',
        name: '同分類較新',
        category_id: 'computer',
        channel_id: 'momo',
        tag_ids: ['typing'],
        published_at: '2026-06-04T00:00:00+08:00',
      }),
      makeProduct({
        id: 'different-category-two-tags-new',
        status: 'published',
        name: '不同分類兩個標籤較新',
        category_id: 'home',
        channel_id: 'pchome',
        tag_ids: ['typing', 'wireless'],
        published_at: '2026-06-06T00:00:00+08:00',
      }),
      makeProduct({
        id: 'draft-related',
        status: 'draft',
        name: '草稿推薦',
        category_id: 'computer',
        channel_id: 'pchome',
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
})
