import { describe, expect, it } from 'vitest'

import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import { splitDetailTaxonomyTags } from '../../app/utils/content/split-detail-taxonomy-tags'
import { test_taxonomies } from '../published-products/fixtures'

function makeResolverWithBrand() {
  return createTaxonomyLabelResolver({
    ...test_taxonomies,
    brands: [
      { id: 'panasonic', label: 'Panasonic', description: '', aliases: [], nav_visible: true, sort_order: 10 },
    ],
  })
}

describe('splitDetailTaxonomyTags', () => {
  it('should route a brand id to the brand group and a plain tag id to the tag group', () => {
    const result = splitDetailTaxonomyTags(['typing', 'panasonic'], makeResolverWithBrand())

    expect(result.brand_ids).toEqual(['panasonic'])
    expect(result.tag_ids).toEqual(['typing'])
  })

  it('should never leave a brand id inside the tag group', () => {
    const result = splitDetailTaxonomyTags(['panasonic', 'typing'], makeResolverWithBrand())

    expect(result.tag_ids).not.toContain('panasonic')
  })

  it('should pair each id with its resolved label in the matching group', () => {
    const result = splitDetailTaxonomyTags(['typing', 'panasonic'], makeResolverWithBrand())

    expect(result.tag_labels).toEqual(['輸入'])
    expect(result.brand_labels).toEqual(['Panasonic'])
  })

  it('should preserve the original ordering within each group', () => {
    const resolver = createTaxonomyLabelResolver({
      ...test_taxonomies,
      tags: [
        { id: 'aaa', label: 'AAA', description: '', aliases: [], nav_visible: true, sort_order: 1 },
        { id: 'bbb', label: 'BBB', description: '', aliases: [], nav_visible: true, sort_order: 2 },
      ],
      brands: [
        { id: 'brand-x', label: 'Brand X', description: '', aliases: [], nav_visible: true, sort_order: 1 },
        { id: 'brand-y', label: 'Brand Y', description: '', aliases: [], nav_visible: true, sort_order: 2 },
      ],
    })

    const result = splitDetailTaxonomyTags(['bbb', 'brand-y', 'aaa', 'brand-x'], resolver)

    expect(result.tag_ids).toEqual(['bbb', 'aaa'])
    expect(result.brand_ids).toEqual(['brand-y', 'brand-x'])
  })

  it('should keep empty groups when there are no matching ids', () => {
    const result = splitDetailTaxonomyTags(['typing'], makeResolverWithBrand())

    expect(result.brand_ids).toEqual([])
    expect(result.brand_labels).toEqual([])
  })
})
