import { describe, expect, it } from 'vitest'

import { getTagChips } from '../../app/utils/published-products/tags'
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
})
