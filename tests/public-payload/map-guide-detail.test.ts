import { describe, expect, it } from 'vitest'

import { mapGuideDetail } from '../../scripts/public-payload/map-guide-detail'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import type { Guide } from '../../app/utils/product-schema'
import { base_guide, makeProduct, test_taxonomies } from '../published-products/fixtures'

const labels = createTaxonomyLabelResolver(test_taxonomies)

function makeGuide(guide: Partial<Guide> & Pick<Guide, 'id'>): Guide {
  return {
    ...base_guide,
    ...guide,
  }
}

describe('guide detail build mapper', () => {
  it('should expose the guide detail content semantics with hero, taxonomy and source url', () => {
    const guide = makeGuide({
      id: 'keyboard-guide',
      title: '鍵盤入門指南',
      short_description: '挑鍵盤前先看這篇',
      body: '## 重點\n\n第一段內文。',
      source_url: 'https://example.com/keyboard-guide',
      image_file: 'keyboard-guide.jpg',
      image_url: null,
      category_ids: ['computer'],
      tag_ids: ['typing'],
      related_product_ids: [],
      reference_links: [
        { title: '鍵盤參考文章', url: 'https://example.com/keyboard-reference' },
      ],
    })

    expect(mapGuideDetail(guide, [], labels)).toEqual({
      id: 'keyboard-guide',
      title: '鍵盤入門指南',
      short_description: '挑鍵盤前先看這篇',
      body: '## 重點\n\n第一段內文。',
      hero_image_url: '/guides/images/keyboard-guide.jpg',
      hero_alt: '鍵盤入門指南',
      category_ids: ['computer'],
      category_labels: ['電腦'],
      tag_ids: ['typing'],
      tag_labels: ['輸入'],
      brand_ids: [],
      brand_labels: [],
      source_url: 'https://example.com/keyboard-guide',
      reference_links: [
        { title: '鍵盤參考文章', url: 'https://example.com/keyboard-reference' },
      ],
      related_products: [],
    })
  })

  it('should normalize omitted guide reference links to an empty array', () => {
    const guide = makeGuide({ id: 'no-reference-links-guide', reference_links: undefined })

    expect(mapGuideDetail(guide, [], labels).reference_links).toEqual([])
  })

  it('should split brand ids out of tag_ids into a brand group so brand pills route to /brand (not dead /tag/{brand})', () => {
    const brand_labels = createTaxonomyLabelResolver({
      ...test_taxonomies,
      brands: [
        { id: 'panasonic', label: 'Panasonic', description: '', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    })
    const guide = makeGuide({ id: 'brand-guide', tag_ids: ['typing', 'panasonic'] })

    const detail = mapGuideDetail(guide, [], brand_labels)

    expect(detail.tag_ids).toEqual(['typing'])
    expect(detail.brand_ids).toEqual(['panasonic'])
    expect(detail.brand_labels).toEqual(['Panasonic'])
    expect(detail.tag_ids).not.toContain('panasonic')
  })

  it('should use the guide title as the hero alt text', () => {
    const guide = makeGuide({ id: 'alt-guide', title: '替代文字指南' })

    expect(mapGuideDetail(guide, [], labels).hero_alt).toBe('替代文字指南')
  })

  it('should resolve local guide image files for the hero image', () => {
    const guide = makeGuide({ id: 'local-image-guide', image_file: 'local-image-guide.png', image_url: null })

    expect(mapGuideDetail(guide, [], labels).hero_image_url).toBe('/guides/images/local-image-guide.png')
  })

  it('should fall back to an empty hero image url when the guide has no image', () => {
    const guide = makeGuide({ id: 'no-image-guide', image_file: null, image_url: null })

    expect(mapGuideDetail(guide, [], labels).hero_image_url).toBe('')
  })

  it('should keep the body markdown intact when present', () => {
    const guide = makeGuide({ id: 'body-guide', body: '## 標題\n\n- 一\n- 二' })

    expect(mapGuideDetail(guide, [], labels).body).toBe('## 標題\n\n- 一\n- 二')
  })

  it('should expose an empty body when the guide has no body field', () => {
    const guide = makeGuide({ id: 'bodyless-guide', body: undefined })

    expect(mapGuideDetail(guide, [], labels).body).toBe('')
  })

  it('should map every category id to its taxonomy label', () => {
    const guide = makeGuide({ id: 'multi-category-guide', category_ids: ['computer', 'home'] })

    expect(mapGuideDetail(guide, [], labels).category_labels).toEqual(['電腦', '居家'])
  })

  it('should map every tag id to its taxonomy label', () => {
    const guide = makeGuide({ id: 'multi-tag-guide', tag_ids: ['typing', 'wireless'] })

    expect(mapGuideDetail(guide, [], labels).tag_labels).toEqual(['輸入', '無線'])
  })

  it('should carry the raw category and tag ids so the detail can deep link to /category/{id} and /tag/{id}', () => {
    const guide = makeGuide({ id: 'id-carrying-guide', category_ids: ['computer', 'home'], tag_ids: ['typing', 'wireless'] })

    const detail = mapGuideDetail(guide, [], labels)

    expect(detail.category_ids).toEqual(['computer', 'home'])
    expect(detail.tag_ids).toEqual(['typing', 'wireless'])
  })

  it('should include related product cards for published referenced products in reference order', () => {
    const guide = makeGuide({ id: 'related-guide', related_product_ids: ['second-product', 'first-product'] })
    const products = [
      makeProduct({ id: 'first-product', status: 'published', name: '第一個商品', category_id: 'computer', offers: [makeOffer('pchome')] }),
      makeProduct({ id: 'second-product', status: 'published', name: '第二個商品', category_id: 'home', offers: [makeOffer('momo')] }),
    ]

    const detail = mapGuideDetail(guide, products, labels)

    // AC6／AC8：guide 的 related 卡與 product 頁同一 mapper（ADR-036-6），欄位即 ProductCardView 全集。
    expect(detail.related_products).toEqual([
      {
        id: 'second-product',
        name: '第二個商品',
        short_description: '推薦短評',
        image_url: '/products/images/sample-product.jpg',
        category_id: 'home',
        category_label: '居家',
        channel_id: 'momo',
        channel_ids: ['momo'],
        channel_label: 'momo',
        price_label: 'NT$ 1,990',
        tag_ids: ['tag-a'],
        tag_labels: ['標籤 A'],
        published_at: '2026-06-02T00:00:00+08:00',
      },
      {
        id: 'first-product',
        name: '第一個商品',
        short_description: '推薦短評',
        image_url: '/products/images/sample-product.jpg',
        category_id: 'computer',
        category_label: '電腦',
        channel_id: 'pchome',
        channel_ids: ['pchome'],
        channel_label: 'PChome',
        price_label: 'NT$ 1,990',
        tag_ids: ['tag-a'],
        tag_labels: ['標籤 A'],
        published_at: '2026-06-02T00:00:00+08:00',
      },
    ])
  })

  it('should skip referenced products that are not published', () => {
    const guide = makeGuide({ id: 'mixed-related-guide', related_product_ids: ['draft-product', 'live-product'] })
    const products = [
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品' }),
      makeProduct({ id: 'live-product', status: 'published', name: '上架商品' }),
    ]

    expect(mapGuideDetail(guide, products, labels).related_products.map((product) => product.id)).toEqual(['live-product'])
  })

  it('should skip referenced product ids that do not match any product', () => {
    const guide = makeGuide({ id: 'missing-related-guide', related_product_ids: ['ghost-product'] })
    const products = [makeProduct({ id: 'live-product', status: 'published', name: '上架商品' })]

    expect(mapGuideDetail(guide, products, labels).related_products).toEqual([])
  })

  it('should return no related products when the guide references none', () => {
    const guide = makeGuide({ id: 'no-related-guide', related_product_ids: [] })
    const products = [makeProduct({ id: 'live-product', status: 'published', name: '上架商品' })]

    expect(mapGuideDetail(guide, products, labels).related_products).toEqual([])
  })

  it('should match referenced products by content id regardless of path prefix', () => {
    const guide = makeGuide({ id: 'prefixed-related-guide', related_product_ids: ['live-product'] })
    const products = [makeProduct({ id: 'products/live-product.json', status: 'published', name: '帶路徑前綴商品' })]

    expect(mapGuideDetail(guide, products, labels).related_products.map((product) => product.id)).toEqual(['live-product'])
  })
})

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
