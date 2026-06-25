import { describe, expect, it } from 'vitest'

import { collectNonEmptyTaxonomyIds } from '../../app/utils/published-products/non-empty-taxonomy-ids'
import type { TaxonomyItemsSource } from '../../app/utils/published-products/select-taxonomy-items'

function makeSource(): TaxonomyItemsSource {
  return {
    products: [
      { category_id: 'computer', tag_ids: ['typing'], channel_ids: ['pchome'] },
      { category_id: 'home', tag_ids: ['food'], channel_ids: ['momo', 'pchome'] },
    ],
    guides: [
      { category_ids: ['computer', 'kitchen'], tag_ids: ['typing'] },
    ],
    links: [
      { category_ids: ['other'], tag_ids: ['link-only'] },
    ],
  }
}

describe('collectNonEmptyTaxonomyIds', () => {
  it('should collect category ids referenced by product single id or guide/link plural ids', () => {
    const { category_ids } = collectNonEmptyTaxonomyIds(makeSource())

    expect(category_ids).toEqual(new Set(['computer', 'home', 'kitchen', 'other']))
  })

  it('should collect tag ids referenced by any of the three types', () => {
    const { tag_ids } = collectNonEmptyTaxonomyIds(makeSource())

    expect(tag_ids).toEqual(new Set(['typing', 'food', 'link-only']))
  })

  it('should return empty sets when no items carry any taxonomy id', () => {
    const result = collectNonEmptyTaxonomyIds({ products: [], guides: [], links: [] })

    expect(result.category_ids).toEqual(new Set())
    expect(result.tag_ids).toEqual(new Set())
  })

  it('should treat a taxonomy id referenced only by a link as non-empty (cross-type)', () => {
    const result = collectNonEmptyTaxonomyIds({
      products: [],
      guides: [],
      links: [{ category_ids: ['link-cat'], tag_ids: ['link-tag'], channel_ids: [] }],
    })

    expect(result.category_ids).toEqual(new Set(['link-cat']))
    expect(result.tag_ids).toEqual(new Set(['link-tag']))
  })

  it('should collect channel ids referenced by any published product offer', () => {
    const { channel_ids } = collectNonEmptyTaxonomyIds(makeSource())

    expect(channel_ids).toEqual(new Set(['pchome', 'momo']))
  })

  it('should leave channel ids empty when no product carries a channel id', () => {
    const result = collectNonEmptyTaxonomyIds({
      products: [{ category_id: 'c', tag_ids: [], channel_ids: [] }],
      guides: [],
      links: [],
    })

    expect(result.channel_ids).toEqual(new Set())
  })

  it('should split tag_ids into brand ids and tag ids using known brand membership (ADR-8)', () => {
    // panasonic 屬 brands.json，typing/food/link-only 為一般 tag；
    // 切分後 brand id 不得殘留於 tag_ids，反之亦然。
    const source: TaxonomyItemsSource = {
      products: [
        { category_id: 'home', tag_ids: ['typing', 'panasonic'], channel_ids: [] },
        { category_id: 'home', tag_ids: ['food', 'sony'], channel_ids: [] },
      ],
      guides: [],
      links: [],
    }
    const result = collectNonEmptyTaxonomyIds(source, { brand_ids: new Set(['panasonic', 'sony']) })

    expect(result.brand_ids).toEqual(new Set(['panasonic', 'sony']))
    expect(result.tag_ids).toEqual(new Set(['typing', 'food']))
    expect([...result.tag_ids].some((id) => result.brand_ids.has(id))).toBe(false)
  })

  it('should keep all tag_ids as tags and brand_ids empty when no brand membership is provided', () => {
    const result = collectNonEmptyTaxonomyIds(makeSource())

    expect(result.brand_ids).toEqual(new Set())
    expect(result.tag_ids).toEqual(new Set(['typing', 'food', 'link-only']))
  })
})
