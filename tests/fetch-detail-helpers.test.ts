import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchProductDetail } from '../app/utils/fetch-product-detail'
import { fetchGuideDetail } from '../app/utils/fetch-guide-detail'

// per-id detail fetch helper 走 universal $fetch；route 在 generate 時 prerender 成
// static /api/{products|guides}/{id}.json。此處以 mock $fetch 驗行為契約：helper 打對
// prerender 端點並原樣回傳其內容——若 client helper 的 URL 與 prerender route 漂移，詳情頁會在 runtime 壞掉。
describe('per-id detail fetch helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should fetch a single product detail from its prerendered per-id JSON endpoint', async () => {
    const product_detail = { id: 'sample-product', name: '示範商品' }
    const fetch_spy = vi.fn().mockResolvedValue(product_detail)
    vi.stubGlobal('$fetch', fetch_spy)

    const result = await fetchProductDetail('sample-product')

    expect(fetch_spy).toHaveBeenCalledWith('/api/products/sample-product.json')
    expect(result).toBe(product_detail)
  })

  it('should fetch a single guide detail from its prerendered per-id JSON endpoint', async () => {
    const guide_detail = { id: 'sample-guide', title: '示範指南' }
    const fetch_spy = vi.fn().mockResolvedValue(guide_detail)
    vi.stubGlobal('$fetch', fetch_spy)

    const result = await fetchGuideDetail('sample-guide')

    expect(fetch_spy).toHaveBeenCalledWith('/api/guides/sample-guide.json')
    expect(result).toBe(guide_detail)
  })
})
