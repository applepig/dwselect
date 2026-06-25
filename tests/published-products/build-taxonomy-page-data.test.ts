import { describe, expect, it } from 'vitest'

import { buildTaxonomyPageData } from '../../app/utils/published-products/build-taxonomy-page-data'
import type { TaxonomyPageInput } from '../../app/utils/published-products/build-taxonomy-page-data'
import type { ProductCardView } from '../../app/utils/public-content-view-types'
import type { CompactResourceRow } from '../../app/utils/published-products/types'

function makeCard(overrides: Partial<ProductCardView> & Pick<ProductCardView, 'id'>): ProductCardView {
  return {
    name: `${overrides.id} 商品`,
    summary: '短評',
    image_url: '/products/images/x.jpg',
    category_id: 'computer',
    category_label: '電腦',
    channel_id: 'pchome',
    channel_ids: ['pchome'],
    channel_label: 'PChome',
    price_label: 'NT$ 1,990',
    tag_ids: [],
    tag_labels: [],
    published_at: '2026-06-02T00:00:00+08:00',
    ...overrides,
  }
}

function makeRow(overrides: Partial<CompactResourceRow> & Pick<CompactResourceRow, 'id' | 'type'>): CompactResourceRow {
  return {
    title: `${overrides.id} 標題`,
    subtitle: '副標',
    meta: null,
    href: `/x/${overrides.id}`,
    image_url: null,
    icon: null,
    external: false,
    target: null,
    rel: null,
    category_ids: [],
    tag_ids: [],
    ...overrides,
  }
}

function makeInput(overrides: Partial<TaxonomyPageInput> = {}): TaxonomyPageInput {
  return {
    products: [
      makeCard({ id: 'p-computer', category_id: 'computer', tag_ids: ['typing'] }),
      makeCard({ id: 'p-home', category_id: 'home', tag_ids: [] }),
    ],
    guides: [
      makeRow({ id: 'g-computer', type: 'guide', category_ids: ['computer'], tag_ids: ['typing'] }),
    ],
    links: [
      makeRow({ id: 'l-other', type: 'link', category_ids: ['other'], tag_ids: [], external: true }),
    ],
    taxonomies: {
      categories: [
        { id: 'computer', label: '電腦', short_label: '電腦', nav_visible: true, sort_order: 10 },
        { id: 'home', label: '居家', short_label: '居家', nav_visible: true, sort_order: 20 },
        { id: 'other', label: '其他', short_label: '其他', nav_visible: true, sort_order: 30 },
      ],
      channels: [
        { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: [], sort_order: 10 },
      ],
      tags: [
        { id: 'typing', label: '輸入', description: '輸入設備簡介', aliases: [], nav_visible: true, sort_order: 10 },
      ],
      brands: [],
    },
    ...overrides,
  }
}

describe('buildTaxonomyPageData', () => {
  it('should expose the category label as the page title and no description for a category', () => {
    const data = buildTaxonomyPageData(makeInput(), { kind: 'category', id: 'computer' })

    expect(data?.taxonomy_kind).toBe('category')
    expect(data?.id).toBe('computer')
    expect(data?.label).toBe('電腦')
    expect(data?.description).toBeNull()
  })

  it('should expose the tag label and its description for a tag page', () => {
    const data = buildTaxonomyPageData(makeInput(), { kind: 'tag', id: 'typing' })

    expect(data?.label).toBe('輸入')
    expect(data?.description).toBe('輸入設備簡介')
  })

  it('should return null for a brand id requested under the tag prefix (ADR-10 single-canonical)', () => {
    // ADR-10（2026-06-24 修訂）：brand 改走專屬 /brand/{id}，/tag/{brand-id} 非 canonical，恆 404。
    // 即便 brand 與 tag 共用 tag_ids predicate 會選到項目，namespace guard 仍須回 null。
    const input = makeInput({
      products: [makeCard({ id: 'p-panasonic', tag_ids: ['panasonic'] })],
      guides: [],
      links: [],
      taxonomies: {
        ...makeInput().taxonomies,
        brands: [
          { id: 'panasonic', label: 'Panasonic', description: 'Panasonic 品牌商品', aliases: [], nav_visible: true, sort_order: 10 },
        ],
      },
    })

    expect(buildTaxonomyPageData(input, { kind: 'tag', id: 'panasonic' })).toBeNull()
  })

  it('should drive a brand page off the brands.json label/description and select via tag_ids (ADR-8/10)', () => {
    const input = makeInput({
      products: [makeCard({ id: 'p-panasonic', tag_ids: ['panasonic'] })],
      guides: [],
      links: [],
      taxonomies: {
        ...makeInput().taxonomies,
        brands: [
          { id: 'panasonic', label: 'Panasonic', description: 'Panasonic 品牌商品', aliases: [], nav_visible: true, sort_order: 10 },
        ],
      },
    })
    const data = buildTaxonomyPageData(input, { kind: 'brand', id: 'panasonic' })

    expect(data?.taxonomy_kind).toBe('brand')
    expect(data?.label).toBe('Panasonic')
    expect(data?.description).toBe('Panasonic 品牌商品')
    expect(data?.products.map((card) => card.id)).toEqual(['p-panasonic'])
  })

  it('should drive a channel page as products-only with the channel label and no description (ADR-9)', () => {
    const input = makeInput({
      products: [
        makeCard({ id: 'p-pchome', channel_ids: ['pchome', 'momo'] }),
        makeCard({ id: 'p-momo-only', channel_ids: ['momo'] }),
      ],
      guides: [makeRow({ id: 'g-x', type: 'guide', category_ids: ['computer'], tag_ids: [] })],
      links: [makeRow({ id: 'l-x', type: 'link', category_ids: ['computer'], tag_ids: [] })],
    })
    const data = buildTaxonomyPageData(input, { kind: 'channel', id: 'pchome' })

    expect(data?.taxonomy_kind).toBe('channel')
    expect(data?.label).toBe('PChome')
    // channels.json 無 description（ADR-9）：channel 頁不顯示簡介段。
    expect(data?.description).toBeNull()
    expect(data?.products.map((card) => card.id)).toEqual(['p-pchome'])
    // products-only：guide／link 恆空，即便 source 帶有 guide／link。
    expect(data?.guides).toEqual([])
    expect(data?.links).toEqual([])
  })

  it('should return null for a channel referenced by no product', () => {
    expect(buildTaxonomyPageData(makeInput(), { kind: 'channel', id: 'ghost-channel' })).toBeNull()
  })

  it('should include only the products/guides/links associated with the category', () => {
    const data = buildTaxonomyPageData(makeInput(), { kind: 'category', id: 'computer' })

    expect(data?.products.map((card) => card.id)).toEqual(['p-computer'])
    expect(data?.guides.map((row) => row.id)).toEqual(['g-computer'])
    expect(data?.links).toEqual([])
  })

  it('should select across types by tag id', () => {
    const data = buildTaxonomyPageData(makeInput(), { kind: 'tag', id: 'typing' })

    expect(data?.products.map((card) => card.id)).toEqual(['p-computer'])
    expect(data?.guides.map((row) => row.id)).toEqual(['g-computer'])
    expect(data?.links).toEqual([])
  })

  it('should keep a type empty when the taxonomy has items only in other types', () => {
    const data = buildTaxonomyPageData(makeInput(), { kind: 'category', id: 'other' })

    expect(data?.products).toEqual([])
    expect(data?.guides).toEqual([])
    expect(data?.links.map((row) => row.id)).toEqual(['l-other'])
  })

  it('should return null when no type has any item for the taxonomy id', () => {
    expect(buildTaxonomyPageData(makeInput(), { kind: 'tag', id: 'unreferenced-tag' })).toBeNull()
  })

  it('should return null when the taxonomy id does not exist at all', () => {
    expect(buildTaxonomyPageData(makeInput(), { kind: 'category', id: 'ghost-category' })).toBeNull()
  })

  it('should return null when a category id has items but no definition (namespace guard, ADR-10)', () => {
    // 不在 categories namespace 的 id 即使有關聯項目也視為 404，不渲染——runtime 直接／客端訪問防線。
    const input = makeInput({
      products: [makeCard({ id: 'p-orphan', category_id: 'orphan-cat', tag_ids: [] })],
      guides: [],
      links: [],
    })

    expect(buildTaxonomyPageData(input, { kind: 'category', id: 'orphan-cat' })).toBeNull()
  })

  // ADR-10 single-canonical invariant：brand 與 tag 共用 tag_ids predicate，但各有獨立 namespace 與 URL 前綴。
  // 直接／客端訪問 /tag/{brand-id} 或 /brand/{tag-id} 不可因共用 predicate 而選到項目、渲染出內容。
  describe('cross-namespace guard (ADR-10)', () => {
    function makeMixedNamespaceInput() {
      return makeInput({
        products: [
          makeCard({ id: 'p-tag', tag_ids: ['typing'] }),
          makeCard({ id: 'p-brand', tag_ids: ['panasonic'] }),
        ],
        guides: [],
        links: [],
        taxonomies: {
          ...makeInput().taxonomies,
          brands: [
            { id: 'panasonic', label: 'Panasonic', description: 'Panasonic 品牌商品', aliases: [], nav_visible: true, sort_order: 10 },
          ],
        },
      })
    }

    it('should return null for /tag/{brand-id}', () => {
      expect(buildTaxonomyPageData(makeMixedNamespaceInput(), { kind: 'tag', id: 'panasonic' })).toBeNull()
    })

    it('should return null for /brand/{tag-id}', () => {
      expect(buildTaxonomyPageData(makeMixedNamespaceInput(), { kind: 'brand', id: 'typing' })).toBeNull()
    })

    it('should still resolve a legitimate /tag and /brand within their own namespace', () => {
      const input = makeMixedNamespaceInput()
      const tag_data = buildTaxonomyPageData(input, { kind: 'tag', id: 'typing' })
      const brand_data = buildTaxonomyPageData(input, { kind: 'brand', id: 'panasonic' })

      expect(tag_data?.products.map((card) => card.id)).toEqual(['p-tag'])
      expect(brand_data?.products.map((card) => card.id)).toEqual(['p-brand'])
    })

    it('should return null for an unknown channel or category id', () => {
      expect(buildTaxonomyPageData(makeInput(), { kind: 'channel', id: 'unknown-channel' })).toBeNull()
      expect(buildTaxonomyPageData(makeInput(), { kind: 'category', id: 'unknown-category' })).toBeNull()
    })

    it('should still resolve a legitimate channel and category within their own namespace', () => {
      const channel_data = buildTaxonomyPageData(makeInput(), { kind: 'channel', id: 'pchome' })
      const category_data = buildTaxonomyPageData(makeInput(), { kind: 'category', id: 'computer' })

      expect(channel_data?.products.map((card) => card.id)).toEqual(['p-computer', 'p-home'])
      expect(category_data?.products.map((card) => card.id)).toEqual(['p-computer'])
    })
  })
})
