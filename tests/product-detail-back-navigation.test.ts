import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const product_detail_url = new URL('../app/components/product-detail.vue', import.meta.url)

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
})
