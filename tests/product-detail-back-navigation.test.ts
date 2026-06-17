import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const product_detail_url = new URL('../app/components/product-detail.vue', import.meta.url)
const catalog_css_url = new URL('../app/assets/styles/catalog.css', import.meta.url)

function readProductDetailSource() {
  return readFileSync(product_detail_url, 'utf8')
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
    const hero_tile_start = product_detail_source.indexOf('class="detail-hero-tile"')
    const back_button_index = product_detail_source.indexOf('class="detail-back"')
    const hero_image_index = product_detail_source.indexOf('class="detail-hero-image"')

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
})

function getCssBlock(source: string, selector: string) {
  const block_start = source.indexOf(`${selector} {`)

  if (block_start === -1) {
    return ''
  }

  const block_end = source.indexOf('\n}', block_start)

  return source.slice(block_start, block_end)
}
