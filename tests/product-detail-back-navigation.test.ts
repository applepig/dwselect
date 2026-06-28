import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const product_detail_url = new URL('../app/components/product-detail.vue', import.meta.url)
const catalog_css_url = new URL('../app/assets/styles/catalog.css', import.meta.url)

function readProductDetailSource() {
  return readFileSync(product_detail_url, 'utf8')
}

function getClassTokenIndex(source: string, class_name: string) {
  return source.search(new RegExp(`class="[^"]*(?<=["\\s])${class_name}(?=["\\s])`))
}

describe('product detail back navigation fallback', () => {
  it('should only use router.back for same-origin browser history and fallback to home', () => {
    const product_detail_source = readProductDetailSource()

    expect(product_detail_source).toContain('function onBackClicked()')
    expect(product_detail_source).toContain('import.meta.client')
    expect(product_detail_source).toContain('window.history.length')
    expect(product_detail_source).toContain('window.history.state')
    expect(product_detail_source).toContain('document.referrer')
    expect(product_detail_source).toContain('window.location.origin')
    expect(product_detail_source).toContain('router.back()')
    expect(product_detail_source).toContain("router.push('/')")
  })

  it('should overlay the back button inside the hero image with symmetric insets', () => {
    const product_detail_source = readProductDetailSource()
    const catalog_css = readFileSync(catalog_css_url, 'utf8')
    const detail_back_css = getCssBlock(catalog_css, '.detail-back')
    const hero_tile_start = getClassTokenIndex(product_detail_source, 'detail-hero-tile')
    const back_button_index = getClassTokenIndex(product_detail_source, 'detail-back')
    const hero_image_index = getClassTokenIndex(product_detail_source, 'detail-hero-image')

    expect(hero_tile_start).toBeGreaterThanOrEqual(0)
    expect(back_button_index).toBeGreaterThan(hero_tile_start)
    expect(back_button_index).toBeLessThan(hero_image_index)
    expect(catalog_css).toContain('--detail-back-inset: 12px;')
    expect(detail_back_css).toContain('inset-block-start: var(--detail-back-inset);')
    expect(detail_back_css).toContain('inset-inline-start: var(--detail-back-inset);')
    expect(detail_back_css).toContain('display: inline-flex;')
    expect(detail_back_css).toContain('align-items: center;')
    expect(detail_back_css).toContain('justify-content: center;')
    expect(detail_back_css).toContain('padding: 0;')
    expect(detail_back_css).not.toContain('top: 12px;')
    expect(detail_back_css).not.toContain('left: 12px;')
  })

  it('should keep AI copy and purchase actions below the desktop hero layout', () => {
    const product_detail_source = readProductDetailSource()
    const hero_layout_index = getClassTokenIndex(product_detail_source, 'detail-hero-layout')
    const hero_tile_index = getClassTokenIndex(product_detail_source, 'detail-hero-tile')
    const summary_column_index = getClassTokenIndex(product_detail_source, 'detail-summary-column')
    const title_index = getClassTokenIndex(product_detail_source, 'detail-title')
    const taxonomy_index = getClassTokenIndex(product_detail_source, 'detail-taxonomy-row')
    const price_index = getClassTokenIndex(product_detail_source, 'detail-price')
    const dw_says_index = getClassTokenIndex(product_detail_source, 'detail-dw-says')
    const summary_buy_link_index = getClassTokenIndex(product_detail_source, 'detail-summary-buy-link')
    const llm_says_index = getClassTokenIndex(product_detail_source, 'detail-llm-says')
    const buy_cta_index = getClassTokenIndex(product_detail_source, 'detail-buy-cta')
    const fine_print_index = getClassTokenIndex(product_detail_source, 'detail-fine-print')
    const first_full_width_section_index = product_detail_source.indexOf('\n      <section\n        v-if="detail.llm_description"', dw_says_index)
    const top_layout_source = product_detail_source.slice(hero_layout_index, first_full_width_section_index)

    expect(hero_layout_index).toBeGreaterThanOrEqual(0)
    expect(hero_tile_index).toBeGreaterThan(hero_layout_index)
    expect(summary_column_index).toBeGreaterThan(hero_tile_index)
    expect(title_index).toBeGreaterThan(summary_column_index)
    expect(taxonomy_index).toBeGreaterThan(title_index)
    expect(price_index).toBeGreaterThan(taxonomy_index)
    expect(dw_says_index).toBeGreaterThan(price_index)
    expect(summary_buy_link_index).toBeGreaterThan(dw_says_index)
    expect(first_full_width_section_index).toBeGreaterThan(summary_buy_link_index)
    expect(top_layout_source).toContain('class="detail-summary-column"')
    expect(top_layout_source).toContain('class="detail-summary-buy-link"')
    expect(top_layout_source).toContain(':href="detail.buy_url"')
    expect(top_layout_source).toContain('去 {{ detail.channel_label }} 逛逛')
    expect(top_layout_source).not.toContain('class="detail-llm-says"')
    expect(top_layout_source).not.toContain('class="detail-buy-cta"')
    expect(top_layout_source).not.toContain('class="detail-fine-print"')
    expect(llm_says_index).toBeGreaterThan(first_full_width_section_index)
    expect(buy_cta_index).toBeGreaterThan(first_full_width_section_index)
    expect(fine_print_index).toBeGreaterThan(first_full_width_section_index)
  })

  it('should switch only the top detail layout to two columns on wider screens', () => {
    const catalog_css = readFileSync(catalog_css_url, 'utf8')
    const default_hero_layout_css = getCssBlock(catalog_css, '.detail-hero-layout')
    const tablet_media_start = catalog_css.indexOf('@media (min-width: 768px) and (max-width: 1199px)')
    const desktop_media_start = catalog_css.indexOf('@media (min-width: 1200px)')
    const tablet_hero_layout_css = getCssBlockAfter(catalog_css, '.detail-hero-layout', tablet_media_start)
    const desktop_hero_layout_css = getCssBlockAfter(catalog_css, '.detail-hero-layout', desktop_media_start)

    expect(default_hero_layout_css).toContain('display: grid;')
    expect(default_hero_layout_css).toContain('grid-template-columns: minmax(0, 1fr);')
    expect(default_hero_layout_css).not.toContain('minmax(0, 0.95fr) minmax(0, 1.05fr)')
    expect(tablet_media_start).toBeGreaterThanOrEqual(0)
    expect(desktop_media_start).toBeGreaterThanOrEqual(0)
    expect(tablet_hero_layout_css).toContain('grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);')
    expect(tablet_hero_layout_css).toContain('align-items: start;')
    expect(desktop_hero_layout_css).toContain('grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);')
    expect(desktop_hero_layout_css).toContain('align-items: start;')
  })

  it('should show the summary purchase link only on wider screens', () => {
    const catalog_css = readFileSync(catalog_css_url, 'utf8')
    const default_summary_buy_link_css = getCssBlock(catalog_css, '.detail-summary-buy-link')
    const tablet_media_start = catalog_css.indexOf('@media (min-width: 768px) and (max-width: 1199px)')
    const desktop_media_start = catalog_css.indexOf('@media (min-width: 1200px)')
    const tablet_summary_buy_link_css = getCssBlockAfter(catalog_css, '.detail-summary-buy-link', tablet_media_start)
    const desktop_summary_buy_link_css = getCssBlockAfter(catalog_css, '.detail-summary-buy-link', desktop_media_start)

    expect(default_summary_buy_link_css).toContain('display: none;')
    expect(default_summary_buy_link_css).toContain('border: 1px solid var(--dw-border);')
    expect(default_summary_buy_link_css).toContain('color: var(--dw-accent);')
    expect(tablet_summary_buy_link_css).toContain('display: inline-flex;')
    expect(desktop_summary_buy_link_css).toContain('display: inline-flex;')
  })

  it('should keep both detail CTAs compact and text-aligned on wider screens', () => {
    const product_detail_source = readProductDetailSource()
    const catalog_css = readFileSync(catalog_css_url, 'utf8')
    const default_buy_cta_css = getCssBlock(catalog_css, '.detail-buy-cta')
    const tablet_media_start = catalog_css.indexOf('@media (min-width: 768px) and (max-width: 1199px)')
    const desktop_media_start = catalog_css.indexOf('@media (min-width: 1200px)')
    const tablet_summary_buy_link_css = getCssBlockAfter(catalog_css, '.detail-summary-buy-link', tablet_media_start)
    const tablet_buy_cta_css = getCssBlockAfter(catalog_css, '.detail-buy-cta', tablet_media_start)
    const desktop_summary_buy_link_css = getCssBlockAfter(catalog_css, '.detail-summary-buy-link', desktop_media_start)
    const desktop_buy_cta_css = getCssBlockAfter(catalog_css, '.detail-buy-cta', desktop_media_start)

    expect(product_detail_source.match(/去 \{\{ detail\.channel_label \}\} 逛逛/g)).toHaveLength(2)
    expect(default_buy_cta_css).toContain('max-width: 100%;')
    expect(tablet_summary_buy_link_css).toContain('width: min(100%, 240px);')
    expect(tablet_summary_buy_link_css).toContain('max-width: 240px;')
    expect(tablet_buy_cta_css).toContain('justify-self: start;')
    expect(tablet_buy_cta_css).toContain('width: min(100%, 240px);')
    expect(tablet_buy_cta_css).toContain('max-width: 240px;')
    expect(tablet_buy_cta_css).toContain('justify-content: center;')
    expect(desktop_summary_buy_link_css).toContain('width: min(100%, 240px);')
    expect(desktop_summary_buy_link_css).toContain('max-width: 240px;')
    expect(desktop_buy_cta_css).toContain('justify-self: start;')
    expect(desktop_buy_cta_css).toContain('width: min(100%, 240px);')
    expect(desktop_buy_cta_css).toContain('max-width: 240px;')
    expect(desktop_buy_cta_css).toContain('justify-content: center;')
  })
})

function getCssBlock(source: string, selector: string) {
  const block_start = source.indexOf(`${selector} {`)

  if (block_start === -1) {
    return ''
  }

  const block_end = source.indexOf('\n}', block_start)

  return source.slice(block_start, block_end)
}

function getCssBlockAfter(source: string, selector: string, offset: number) {
  if (offset < 0) {
    return ''
  }

  const block_start = source.indexOf(`${selector} {`, offset)

  if (block_start === -1) {
    return ''
  }

  const block_end = source.indexOf('\n  }', block_start)

  return source.slice(block_start, block_end)
}
