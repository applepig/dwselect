import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const project_root_url = new URL('../../', import.meta.url)

function readPage(file_path: string): string {
  return readFileSync(new URL(file_path, project_root_url), 'utf8')
}

const category_source = readPage('app/pages/category/[id].vue')
const tag_source = readPage('app/pages/tag/[id].vue')
const brand_source = readPage('app/pages/brand/[id].vue')
const channel_source = readPage('app/pages/channel/[id].vue')

// 032 M3：四頁的 setup 共用邏輯（route id 正規化、canonical、404、useHead／useSeoMeta、fetch）已收進
// useTaxonomyDetailPage composable。404／canonical／meta／head-before-await 的接線守門遷至
// tests/use-taxonomy-detail-page.test.ts（行為仍守住，只是單一真相搬到 composable）。
// 本檔保留各頁自留的職責：以正確 kind 接線 composable，以及 template 組成差異（CategoryChipBar 僅 category 頁）。
describe('taxonomy page shells', () => {
  it('should wire each page to the shared composable with its own taxonomy kind', () => {
    expect(category_source).toContain("useTaxonomyDetailPage('category')")
    expect(tag_source).toContain("useTaxonomyDetailPage('tag')")
    expect(brand_source).toContain("useTaxonomyDetailPage('brand')")
    expect(channel_source).toContain("useTaxonomyDetailPage('channel')")
  })

  it('should compose the shared TaxonomyPage component rather than inlining list markup', () => {
    for (const source of [category_source, tag_source, brand_source, channel_source]) {
      expect(source).toContain('<TaxonomyPage')
      expect(source).not.toContain('product-grid')
      expect(source).not.toContain('<ResourceList')
    }
  })

  it('should mount the shared CategoryChipBar only on the category shell, never on other taxonomy shells', () => {
    // 031.1 B1（AC6）：分類頁以共用 CategoryChipBar 持久化 chip bar；wrapper 為 compact-page。
    // Why：鎖住此接線，防 B1 行為被誤移除；並守住非目標邊界——
    // tag/brand/channel 頁不得出現 category chip bar（spec「非目標」第二條），避免 chip bar 外溢其他 taxonomy 頁。
    expect(category_source).toContain('<CategoryChipBar')
    expect(category_source).toContain('class="compact-page"')
    for (const source of [tag_source, brand_source, channel_source]) {
      expect(source).not.toContain('<CategoryChipBar')
    }
  })
})
