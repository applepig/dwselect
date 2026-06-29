import { describe, expect, it } from 'vitest'

import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import { test_taxonomies } from './fixtures'

const resolver = createTaxonomyLabelResolver(test_taxonomies)

// brand 與 tag 共用 `tag_ids` namespace（ADR-8），taxonomy 頁的 tag getter 需 tags→brands fallback。
const resolver_with_brand = createTaxonomyLabelResolver({
  ...test_taxonomies,
  brands: [
    { id: 'panasonic', label: 'Panasonic', description: 'Panasonic 品牌商品', aliases: [], nav_visible: true, sort_order: 10 },
  ],
})

describe('createTaxonomyLabelResolver taxonomy tag label getter', () => {
  it('should return the tag label for an id defined in tags', () => {
    expect(resolver_with_brand.getTaxonomyTagLabel('typing')).toBe('輸入')
  })

  it('should fall back to the brand label for an id defined only in brands', () => {
    expect(resolver_with_brand.getTaxonomyTagLabel('panasonic')).toBe('Panasonic')
  })

  it('should fall back to the raw id when the id is neither a tag nor a brand', () => {
    expect(resolver_with_brand.getTaxonomyTagLabel('does-not-exist')).toBe('does-not-exist')
  })
})

describe('createTaxonomyLabelResolver taxonomy tag description getter', () => {
  it('should return the tag description for an id defined in tags', () => {
    expect(resolver_with_brand.getTaxonomyTagDescription('typing')).toBe('輸入設備')
  })

  it('should fall back to the brand description for an id defined only in brands', () => {
    expect(resolver_with_brand.getTaxonomyTagDescription('panasonic')).toBe('Panasonic 品牌商品')
  })

  it('should return null when neither a tag nor a brand defines the id', () => {
    expect(resolver_with_brand.getTaxonomyTagDescription('does-not-exist')).toBeNull()
  })

  it('should return null when a brand carries an empty description', () => {
    const resolver_blank_brand = createTaxonomyLabelResolver({
      ...test_taxonomies,
      brands: [
        { id: 'blank-brand', label: '空白品牌', description: '', aliases: [], nav_visible: true, sort_order: 1 },
      ],
    })

    expect(resolver_blank_brand.getTaxonomyTagDescription('blank-brand')).toBeNull()
  })
})

describe('createTaxonomyLabelResolver tag description getter', () => {
  it('should return the description of a known content tag', () => {
    // 'typing' 在 fixtures 的 tags 帶 description '輸入設備'
    expect(resolver.getContentTagDescription('typing')).toBe('輸入設備')
  })

  it('should return null for a tag id that has no taxonomy definition', () => {
    expect(resolver.getContentTagDescription('does-not-exist')).toBeNull()
  })

  it('should return null when a known tag carries an empty description', () => {
    const resolver_with_blank = createTaxonomyLabelResolver({
      ...test_taxonomies,
      tags: [
        { id: 'blank-tag', label: '空白', description: '', aliases: [], nav_visible: true, sort_order: 1 },
      ],
    })

    expect(resolver_with_blank.getContentTagDescription('blank-tag')).toBeNull()
  })
})
