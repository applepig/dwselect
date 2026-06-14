import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

function readSource(relative_path: string) {
  return readFileSync(new URL(relative_path, import.meta.url), 'utf8')
}

describe('empty states adopt UEmpty', () => {
  const index_source = readSource('../app/pages/index.vue')
  const guide_source = readSource('../app/pages/guide.vue')
  const links_source = readSource('../app/pages/links.vue')
  const search_source = readSource('../app/pages/search.vue')

  it('should render the home empty state as UEmpty with the unchanged wording', () => {
    expect(index_source).toContain('<UEmpty')
    expect(index_source).toContain('title="目前沒有已上架商品"')
    expect(index_source).not.toContain('class="compact-empty-state"')
    expect(index_source).not.toContain('class="empty-title"')
  })

  it('should render the guide empty state as UEmpty with the unchanged wording', () => {
    expect(guide_source).toContain('<UEmpty')
    expect(guide_source).toContain('title="目前沒有已發布指南"')
    expect(guide_source).not.toContain('class="compact-empty-state"')
    expect(guide_source).not.toContain('class="empty-title"')
  })

  it('should render the links empty state as UEmpty with the unchanged wording', () => {
    expect(links_source).toContain('<UEmpty')
    expect(links_source).toContain('title="目前沒有已發布連結"')
    expect(links_source).not.toContain('class="compact-empty-state"')
    expect(links_source).not.toContain('class="empty-title"')
  })

  it('should render the search no-results and searching states as distinct UEmpty blocks', () => {
    expect(search_source).toContain('<UEmpty')
    expect(search_source).toContain('title="沒這個坑，去許願吧"')
    expect(search_source).toContain('title="搜尋中"')
    expect(search_source).not.toContain('class="compact-empty-state"')
    expect(search_source).not.toContain('class="empty-title"')
  })

  it('should keep the search no-results and searching states on separate icons so the two are not conflated', () => {
    const no_results_index = search_source.indexOf('沒這個坑，去許願吧')
    const searching_index = search_source.indexOf('搜尋中')

    expect(no_results_index).toBeGreaterThanOrEqual(0)
    expect(searching_index).toBeGreaterThanOrEqual(0)
    expect(no_results_index).not.toBe(searching_index)
  })
})

describe('product detail callout adopts UAlert and back button adopts UButton', () => {
  const detail_source = readSource('../app/components/product-detail.vue')

  it('should render the DW callout as a static UAlert keeping the title and text', () => {
    expect(detail_source).toContain('<UAlert')
    expect(detail_source).toContain('title="DW 怎麼說"')
    expect(detail_source).toContain('detail.dw_says')
    expect(detail_source).not.toContain('class="detail-callout"')
    expect(detail_source).not.toContain('class="detail-callout-label"')
    expect(detail_source).not.toContain('class="detail-callout-text"')
  })

  it('should render the back button as a ghost UButton that triggers router back', () => {
    expect(detail_source).toContain('<UButton')
    expect(detail_source).toContain('icon="i-lucide-arrow-left"')
    expect(detail_source).toContain('variant="ghost"')
    expect(detail_source).toContain('@click="onBackClicked"')
    expect(detail_source).toContain('aria-label="返回"')
    expect(detail_source).not.toContain('class="detail-back-button"')
    expect(detail_source).toContain('router.back()')
  })
})

describe('catalog css drops the migrated empty-state and detail-callout styling', () => {
  const catalog_css = readSource('../app/assets/styles/catalog.css')

  it('should drop the compact empty-state base styling', () => {
    expect(catalog_css).not.toContain('.compact-empty-state')
  })

  it('should drop the detail callout and back button styling', () => {
    expect(catalog_css).not.toContain('.detail-callout')
    expect(catalog_css).not.toContain('.detail-back-button')
  })

  it('should keep the empty-title style still used by the search sub-panels', () => {
    expect(catalog_css).toContain('.empty-title')
  })
})
