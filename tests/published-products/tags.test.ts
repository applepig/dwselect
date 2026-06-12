import { describe, expect, it } from 'vitest'

import { getPopularSearchTagGroups, getTagChips } from '../../app/utils/published-products/tags'
import type { Guide, LinkDefinition } from '../../app/utils/product-schema'
import type { TaxonomyDefinitions } from '../../app/utils/published-products/types'
import { base_guide, makeProduct, test_links, test_taxonomies } from './fixtures'

describe('compact app tag chips', () => {
  it('should be able to list all compact tags without the default top-10 limit', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      tags: Array.from({ length: 12 }, (_, index) => ({
        id: `tag-${index + 1}`,
        label: index === 0 ? 'Alpha' : `標籤 ${String(index + 1).padStart(2, '0')}`,
        description: `標籤 ${String(index + 1).padStart(2, '0')}`,
        aliases: [],
        nav_visible: true,
        sort_order: index + 1,
      })),
    }

    const products = [
      makeProduct({ id: 'published-product', status: 'published', name: '已上架商品', tag_ids: ['tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5', 'tag-6', 'tag-7', 'tag-8', 'tag-9', 'tag-10', 'tag-11', 'tag-12'] }),
      makeProduct({ id: 'draft-product', status: 'draft', name: '草稿商品', tag_ids: ['tag-1'] }),
    ]
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'published-guide',
        tag_ids: ['tag-1', 'tag-2'],
      },
    ]
    const links: LinkDefinition[] = [
      {
        ...test_links[0]!,
        id: 'published-link',
        tag_ids: ['tag-2', 'tag-3'],
      },
    ]

    const all_tags = getTagChips(
      {
        products,
        guides,
        links,
      },
      [],
      taxonomies,
      Number.MAX_SAFE_INTEGER,
    )

    expect(all_tags.map((tag) => tag.label)).toEqual([
      '標籤 02',
      'Alpha',
      '標籤 03',
      '標籤 04',
      '標籤 05',
      '標籤 06',
      '標籤 07',
      '標籤 08',
      '標籤 09',
      '標籤 10',
      '標籤 11',
      '標籤 12',
    ])
  })

  it('should resolve brands for product tag chips without applying brands to guides or links', () => {
    const taxonomies: TaxonomyDefinitions = {
      ...test_taxonomies,
      brands: [
        { id: 'fixture-brand', label: 'Fixture Brand', description: '測試品牌', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    }
    const products = [
      makeProduct({ id: 'branded-product', status: 'published', name: '品牌商品', tag_ids: ['fixture-brand'] }),
    ]
    const guides: Guide[] = [
      {
        ...base_guide,
        id: 'guide-with-brand-id-like-tag',
        tag_ids: ['fixture-brand'],
      },
    ]
    const links: LinkDefinition[] = [
      {
        ...test_links[0]!,
        id: 'link-with-brand-id-like-tag',
        tag_ids: ['fixture-brand'],
      },
    ]

    const tag_chips = getTagChips({ products, guides, links }, [], taxonomies, Number.MAX_SAFE_INTEGER)

    expect(tag_chips).toEqual([
      { label: 'fixture-brand', count: 2, active: false },
      { label: 'Fixture Brand', count: 1, active: false },
    ])
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

    const groups = getPopularSearchTagGroups({ products, guides, links: [] }, taxonomies, 3, 1)

    expect(groups.tags).toEqual([
      { label: '標籤 A', count: 5, active: false },
    ])
    expect(groups.brands).toEqual([
      { label: 'Brand A', count: 5, active: false },
    ])
  })
})
