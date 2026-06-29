import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// per-id detail fetch helper 走 universal $fetch（與 fetchPublicContentPayload 同模式），
// route 在 generate 時 prerender 成 static /api/{products|guides}/{id}.json。
describe('per-id detail fetch helpers', () => {
  it('should fetch a single product detail from the per-id route via universal $fetch', () => {
    const source = readFileSync(new URL('../app/utils/fetch-product-detail.ts', import.meta.url), 'utf8')

    expect(source).toContain('export async function fetchProductDetail(id: string)')
    expect(source).toContain('$fetch<ProductDetailView>(`/api/products/${id}.json`)')
    expect(source).not.toContain('readFile')
    expect(source).not.toContain('import.meta.server')
    expect(source).not.toContain('server: false')
  })

  it('should fetch a single guide detail from the per-id route via universal $fetch', () => {
    const source = readFileSync(new URL('../app/utils/fetch-guide-detail.ts', import.meta.url), 'utf8')

    expect(source).toContain('export async function fetchGuideDetail(id: string)')
    expect(source).toContain('$fetch<GuideDetailView>(`/api/guides/${id}.json`)')
    expect(source).not.toContain('readFile')
    expect(source).not.toContain('import.meta.server')
    expect(source).not.toContain('server: false')
  })
})
