import { describe, expect, it } from 'vitest'

import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels'
import { TAXONOMY_KINDS } from '../../app/utils/published-products/taxonomy-kinds'
import type { TaxonomyKind } from '../../app/utils/published-products/select-taxonomy-items'

const ALL_KINDS: TaxonomyKind[] = ['category', 'tag', 'brand', 'channel']

// 顏色各異的 taxonomies：每個 namespace 的 label 都不同，才能驗證 getLabel 走對 getter。
const labels = createTaxonomyLabelResolver({
  categories: [{ id: 'computer', label: '電腦', short_label: '電腦', nav_visible: true, sort_order: 1 }],
  channels: [{ id: 'momo', label: 'momo 通路', host_patterns: [], sort_order: 1 }],
  tags: [{ id: 'typing', label: '輸入', description: '輸入簡介', aliases: [], nav_visible: true, sort_order: 1 }],
  brands: [{ id: 'panasonic', label: 'Panasonic', description: '品牌簡介', aliases: [], nav_visible: true, sort_order: 1 }],
} as never)

describe('TAXONOMY_KINDS table', () => {
  it('should cover exactly the four taxonomy kinds', () => {
    expect(Object.keys(TAXONOMY_KINDS).sort()).toEqual([...ALL_KINDS].sort())
  })

  it('should expose each kind 404 message', () => {
    // 文案值對齊四個 taxonomy 頁的 createError message；頁面實際接線比對留 M3 composable 落地時補。
    expect(TAXONOMY_KINDS.category.notFoundMessage).toBe('找不到分類')
    expect(TAXONOMY_KINDS.tag.notFoundMessage).toBe('找不到標籤')
    expect(TAXONOMY_KINDS.brand.notFoundMessage).toBe('找不到品牌')
    expect(TAXONOMY_KINDS.channel.notFoundMessage).toBe('找不到通路')
  })

  it('should give every kind a non-empty 404 message', () => {
    for (const kind of ALL_KINDS) {
      expect(TAXONOMY_KINDS[kind].notFoundMessage.length).toBeGreaterThan(0)
    }
  })

  describe('getLabel', () => {
    it('should resolve a category label via the category getter', () => {
      expect(TAXONOMY_KINDS.category.getLabel(labels, 'computer')).toBe('電腦')
    })

    it('should resolve a channel label via the channel getter', () => {
      expect(TAXONOMY_KINDS.channel.getLabel(labels, 'momo')).toBe('momo 通路')
    })

    it('should resolve a tag label via the taxonomy tag getter', () => {
      expect(TAXONOMY_KINDS.tag.getLabel(labels, 'typing')).toBe('輸入')
    })

    it('should resolve a brand label via the taxonomy tag getter (tags→brands fallback)', () => {
      // brand 走 getTaxonomyTagLabel（含 brand fallback）；若誤接 category getter 會退回 raw id。
      expect(TAXONOMY_KINDS.brand.getLabel(labels, 'panasonic')).toBe('Panasonic')
    })
  })
})
