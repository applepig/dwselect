import { describe, expect, it } from 'vitest'

import { selectPublishedTaxonomyItems } from '../../app/utils/published-products/select-taxonomy-items'
import type { TaxonomyItemsSource } from '../../app/utils/published-products/select-taxonomy-items'

// Why: selector 餵入「帶 taxonomy ids 的 published-only 清單」而非僅含 label 的舊 payload，
// 故 fixture 以 product(單數 category_id)、guide/link(複數 category_ids) + 三者皆 tag_ids 建構。
function makeSource(): TaxonomyItemsSource {
  return {
    products: [
      { id: 'p-computer-keyboard', category_id: 'computer', tag_ids: ['typing', 'wireless'], channel_ids: ['pchome', 'momo'] },
      { id: 'p-home-rice', category_id: 'home', tag_ids: ['food'], channel_ids: ['amazonjp'] },
    ],
    guides: [
      { id: 'g-keyboard', category_ids: ['computer'], tag_ids: ['typing'] },
      { id: 'g-cooking', category_ids: ['home', 'kitchen'], tag_ids: ['food'] },
    ],
    links: [
      { id: 'l-keyboard-shop', category_ids: ['computer'], tag_ids: ['typing'] },
      { id: 'l-misc', category_ids: ['other'], tag_ids: [] },
    ],
  }
}

describe('selectPublishedTaxonomyItems', () => {
  it('should return every type that references the category via its single or plural category field', () => {
    const result = selectPublishedTaxonomyItems(makeSource(), { kind: 'category', id: 'computer' })

    expect(result.products.map((item) => item.id)).toEqual(['p-computer-keyboard'])
    expect(result.guides.map((item) => item.id)).toEqual(['g-keyboard'])
    expect(result.links.map((item) => item.id)).toEqual(['l-keyboard-shop'])
  })

  it('should return every type that references the tag via tag_ids across all three types', () => {
    const result = selectPublishedTaxonomyItems(makeSource(), { kind: 'tag', id: 'typing' })

    expect(result.products.map((item) => item.id)).toEqual(['p-computer-keyboard'])
    expect(result.guides.map((item) => item.id)).toEqual(['g-keyboard'])
    expect(result.links.map((item) => item.id)).toEqual(['l-keyboard-shop'])
  })

  it('should match a guide that lists the category among several plural category ids', () => {
    const result = selectPublishedTaxonomyItems(makeSource(), { kind: 'category', id: 'kitchen' })

    expect(result.products).toEqual([])
    expect(result.guides.map((item) => item.id)).toEqual(['g-cooking'])
    expect(result.links).toEqual([])
  })

  it('should return an empty array for a type that has no item associated with the taxonomy', () => {
    const result = selectPublishedTaxonomyItems(makeSource(), { kind: 'category', id: 'home' })

    expect(result.products.map((item) => item.id)).toEqual(['p-home-rice'])
    expect(result.guides.map((item) => item.id)).toEqual(['g-cooking'])
    expect(result.links).toEqual([])
  })

  it('should return all three types empty when no item references the taxonomy at all', () => {
    const result = selectPublishedTaxonomyItems(makeSource(), { kind: 'tag', id: 'does-not-exist' })

    expect(result.products).toEqual([])
    expect(result.guides).toEqual([])
    expect(result.links).toEqual([])
  })

  it('should not match a category id against tag_ids (the kind discriminates the field)', () => {
    const source: TaxonomyItemsSource = {
      products: [{ id: 'p', category_id: 'shared', tag_ids: [], channel_ids: [] }],
      guides: [],
      links: [],
    }

    // 'shared' 只是 product 的 category，作為 tag 查詢時不應命中。
    expect(selectPublishedTaxonomyItems(source, { kind: 'tag', id: 'shared' }).products).toEqual([])
    expect(selectPublishedTaxonomyItems(source, { kind: 'category', id: 'shared' }).products.map((item) => item.id)).toEqual(['p'])
  })

  it('should match brand the same way as tag via tag_ids (ADR-8, shared namespace)', () => {
    const source: TaxonomyItemsSource = {
      products: [
        { id: 'p-panasonic', category_id: 'home', tag_ids: ['panasonic'], channel_ids: ['pchome'] },
        { id: 'p-other', category_id: 'home', tag_ids: ['food'], channel_ids: ['pchome'] },
      ],
      guides: [{ id: 'g-panasonic', category_ids: ['home'], tag_ids: ['panasonic'] }],
      links: [{ id: 'l-panasonic', category_ids: ['home'], tag_ids: ['panasonic'] }],
    }
    const result = selectPublishedTaxonomyItems(source, { kind: 'brand', id: 'panasonic' })

    expect(result.products.map((item) => item.id)).toEqual(['p-panasonic'])
    expect(result.guides.map((item) => item.id)).toEqual(['g-panasonic'])
    expect(result.links.map((item) => item.id)).toEqual(['l-panasonic'])
  })

  it('should select channel only from products via channel_ids and keep guides/links empty (ADR-9, products-only)', () => {
    const result = selectPublishedTaxonomyItems(makeSource(), { kind: 'channel', id: 'momo' })

    expect(result.products.map((item) => item.id)).toEqual(['p-computer-keyboard'])
    // channel 是 products-only：guide／link 無購買連結，恆為空。
    expect(result.guides).toEqual([])
    expect(result.links).toEqual([])
  })

  it('should match a product belonging to a channel through any of its offers, not only the primary', () => {
    // p-computer-keyboard 的 channel_ids 同時含 pchome 與 momo；兩者皆應命中。
    expect(selectPublishedTaxonomyItems(makeSource(), { kind: 'channel', id: 'pchome' }).products.map((item) => item.id))
      .toEqual(['p-computer-keyboard'])
    expect(selectPublishedTaxonomyItems(makeSource(), { kind: 'channel', id: 'amazonjp' }).products.map((item) => item.id))
      .toEqual(['p-home-rice'])
  })

  it('should return all empty for a channel referenced by no product', () => {
    const result = selectPublishedTaxonomyItems(makeSource(), { kind: 'channel', id: 'no-such-channel' })

    expect(result.products).toEqual([])
    expect(result.guides).toEqual([])
    expect(result.links).toEqual([])
  })
})
