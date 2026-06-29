import { describe, expect, it } from 'vitest'

import { buildNavigation } from '../../scripts/public-payload/build-navigation'
import type { Guide, LinkDefinition } from '../../app/utils/product-schema'
import type { TaxonomyDefinitions } from '../../app/utils/published-products/types'
import { base_guide, makeProduct, test_taxonomies } from '../published-products/fixtures'

describe('navigation build', () => {
  it('should derive category chips with all chip and counts from published products only', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', category_id: 'home' }),
    ]

    const navigation = buildNavigation({ products, guides: [], links: [] }, test_taxonomies)

    expect(navigation.category_chips).toEqual([
      { id: 'all', label: '全部', count: 2 },
      { id: 'home', label: '居家', count: 1 },
      { id: 'computer', label: '電腦', count: 1 },
    ])
    expect(navigation.desktop_category_items).toEqual(navigation.category_chips)
    expect(navigation.counts.products).toBe(2)
  })

  it('should omit categories with no published products from the chips', () => {
    const products = [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'draft-kitchen-product', status: 'draft', name: '廚房草稿', category_id: 'kitchen' }),
    ]

    const navigation = buildNavigation({ products, guides: [], links: [] }, test_taxonomies)

    expect(navigation.category_chips.map((chip) => chip.id)).not.toContain('kitchen')
  })

  it('should split popular search tags and brands with a count threshold and per-group limit', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      tags: [
        { id: 'tag-a', label: '標籤 A', description: '測試標籤 A', aliases: [], nav_visible: true, sort_order: 10 },
        { id: 'tag-b', label: '標籤 B', description: '測試標籤 B', aliases: [], nav_visible: true, sort_order: 20 },
        { id: 'tag-c', label: '標籤 C', description: '測試標籤 C', aliases: [], nav_visible: true, sort_order: 30 },
      ],
      brands: [
        { id: 'brand-a', label: 'Brand A', description: 'Brand A', aliases: [], nav_visible: true, sort_order: 10 },
        { id: 'brand-b', label: 'Brand B', description: 'Brand B', aliases: [], nav_visible: true, sort_order: 20 },
      ],
    }
    const products = [
      makeProduct({ id: 'p1', status: 'published', name: '一號', tag_ids: ['tag-a', 'tag-b', 'brand-a', 'brand-b'] }),
      makeProduct({ id: 'p2', status: 'published', name: '二號', tag_ids: ['tag-a', 'tag-b', 'brand-a', 'brand-b'] }),
      makeProduct({ id: 'p3', status: 'published', name: '三號', tag_ids: ['tag-a', 'tag-b', 'brand-a', 'brand-b'] }),
      makeProduct({ id: 'p4', status: 'published', name: '四號', tag_ids: ['tag-a', 'tag-b', 'brand-a'] }),
      makeProduct({ id: 'p5', status: 'published', name: '五號', tag_ids: ['tag-a', 'brand-a'] }),
      makeProduct({ id: 'draft', status: 'draft', name: '草稿', tag_ids: ['tag-a', 'brand-a'] }),
    ]
    const guides: Guide[] = [
      { ...base_guide, id: 'guide-a', tag_ids: ['tag-c'] },
      { ...base_guide, id: 'guide-b', tag_ids: ['tag-c'] },
      { ...base_guide, id: 'guide-c', tag_ids: ['tag-c'] },
      { ...base_guide, id: 'guide-d', tag_ids: ['tag-c'] },
    ]
    const links: LinkDefinition[] = []

    const navigation = buildNavigation({ products, guides, links }, taxonomies)

    expect(navigation.popular_search_tags.tags.map((tag) => tag.label)).toEqual(['標籤 A', '標籤 B', '標籤 C'])
    expect(navigation.popular_search_tags.tags.map((tag) => tag.id)).toEqual(['tag-a', 'tag-b', 'tag-c'])
    expect(navigation.popular_search_tags.tags[0]).toEqual({ id: 'tag-a', label: '標籤 A', count: 5, active: false })
    expect(navigation.popular_search_tags.brands).toEqual([
      { id: 'brand-a', label: 'Brand A', count: 5, active: false },
      { id: 'brand-b', label: 'Brand B', count: 3, active: false },
    ])
  })

  it('should keep tags that appear exactly the minimum popular count', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      tags: [
        { id: 'tag-min', label: '剛好門檻', description: '出現剛好門檻次數', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    }
    const products = [
      makeProduct({ id: 'p1', status: 'published', name: '一號', tag_ids: ['tag-min'] }),
      makeProduct({ id: 'p2', status: 'published', name: '二號', tag_ids: ['tag-min'] }),
      makeProduct({ id: 'p3', status: 'published', name: '三號', tag_ids: ['tag-min'] }),
    ]

    const navigation = buildNavigation({ products, guides: [], links: [] }, taxonomies)

    expect(navigation.popular_search_tags.tags).toEqual([
      { id: 'tag-min', label: '剛好門檻', count: 3, active: false },
    ])
  })

  it('should count popular tags by tag id (not label) so different ids never collapse into one chip', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      tags: [
        { id: 'tag-x', label: '同名標籤', description: '描述', aliases: [], nav_visible: true, sort_order: 10 },
        { id: 'tag-y', label: '同名標籤', description: '描述', aliases: [], nav_visible: true, sort_order: 20 },
      ],
    }
    const products = [
      makeProduct({ id: 'p1', status: 'published', name: '一號', tag_ids: ['tag-x', 'tag-y'] }),
      makeProduct({ id: 'p2', status: 'published', name: '二號', tag_ids: ['tag-x', 'tag-y'] }),
      makeProduct({ id: 'p3', status: 'published', name: '三號', tag_ids: ['tag-x', 'tag-y'] }),
    ]

    const navigation = buildNavigation({ products, guides: [], links: [] }, taxonomies)

    // Why: 兩個 tag 標籤同名但 id 不同——以 id 計數應產生兩個各 count=3 的 chip，
    // 若仍以 label 計數會錯誤合併成單一 count=6 的 chip。
    expect(navigation.popular_search_tags.tags.map((tag) => tag.id).toSorted()).toEqual(['tag-x', 'tag-y'])
    expect(navigation.popular_search_tags.tags.every((tag) => tag.count === 3)).toBe(true)
  })

  it('should not count brand ids towards guide or link popular tags', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      brands: [
        { id: 'fixture-brand', label: 'Fixture Brand', description: '測試品牌', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    }
    const products = [
      makeProduct({ id: 'p1', status: 'published', name: '一號', tag_ids: ['fixture-brand'] }),
      makeProduct({ id: 'p2', status: 'published', name: '二號', tag_ids: ['fixture-brand'] }),
      makeProduct({ id: 'p3', status: 'published', name: '三號', tag_ids: ['fixture-brand'] }),
      makeProduct({ id: 'p4', status: 'published', name: '四號', tag_ids: ['fixture-brand'] }),
    ]
    const guides: Guide[] = [
      { ...base_guide, id: 'guide-with-brand-id', tag_ids: ['fixture-brand'] },
    ]

    const navigation = buildNavigation({ products, guides, links: [] }, taxonomies)

    expect(navigation.popular_search_tags.brands).toEqual([
      { id: 'fixture-brand', label: 'Fixture Brand', count: 4, active: false },
    ])
    expect(navigation.popular_search_tags.tags).toEqual([])
  })
})
