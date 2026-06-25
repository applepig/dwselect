import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import { readPublicContentSource } from '../../scripts/content-reader'
import { buildGuideDetail, buildProductDetail } from '../../scripts/public-payload/build-detail-by-id'
import { extractContentId } from '../../app/utils/content/extract-content-id'
import { isPublished } from '../../scripts/public-content'

// 堵住 028 第一版的覆蓋漏洞：route 用 getRouterParam(event, 'id') 取 id，但 h3 (rou3) 把檔名 token
// [id].json 整段解析成單一 param（key 'id.json'），getRouterParam(event, 'id') 回 undefined → 全部
// detail route 在 generate 時 404，卻因當時測試只斷言原始碼字串而漏掉。
//
// 這裡用 nitro 實際產生的 request path 字串，測 route 的核心轉換 decodeURIComponent(extractContentId(path))
// 串到 builder，涵蓋 ascii / 原始 unicode（prerender）/ 百分比編碼（dev fetch）/ 不存在 id。

const product_route_url = new URL('../../server/api/products/[id].json.get.ts', import.meta.url)
const guide_route_url = new URL('../../server/api/guides/[id].json.get.ts', import.meta.url)
const NON_ASCII = /\P{ASCII}/u

// 與正式 route 同一行：把 nitro 餵進來的 event.path 還原成 content id。
function resolveDetailId(event_path: string): string {
  return decodeURIComponent(extractContentId(event_path))
}

describe('per-id detail route id resolution from event.path', () => {
  it('does not rely on getRouterParam(event, "id") — h3 names the param "id.json" for this route shape', () => {
    const product_source = readFileSync(product_route_url, 'utf8')
    const guide_source = readFileSync(guide_route_url, 'utf8')

    for (const route_source of [product_source, guide_source]) {
      // 由 event.path 還原 id，而非 getRouterParam(event, 'id')（後者在此 route shape 下是 undefined）。
      expect(route_source).toContain('extractContentId(event.path)')
    }
  })

  it('resolves an ascii product id from the prerendered request path and builds that detail', async () => {
    const source = await readPublicContentSource()
    const product = source.products.find(isPublished)
    expect(product).toBeDefined()
    const id = extractContentId(product!.id)

    const resolved = resolveDetailId(`/api/products/${id}.json`)
    expect(resolved).toBe(id)
    expect(buildProductDetail(source, resolved)?.id).toBe(id)
  })

  it('resolves a published guide id from its prerender request path and builds that detail', async () => {
    const source = await readPublicContentSource()
    const guide = source.guides.find(isPublished)
    expect(guide).toBeDefined()
    const id = extractContentId(guide!.id)

    const resolved = resolveDetailId(`/api/guides/${id}.json`)
    expect(resolved).toBe(id)
    expect(buildGuideDetail(source, resolved)?.id).toBe(id)
  })

  it('decodes a percent-encoded (non-ascii) request path back to the original content id', () => {
    // 內容目前 id 全 ascii，但 route 仍須能還原非 ascii id：dev 模式瀏覽器會把 CJK path 百分比編碼，
    // prerender 走原始 unicode。用合成 path 驗 decodeURIComponent，不綁定實際內容是否有 CJK id。
    const non_ascii_id = '2026-06-02-日本米入門篇'
    expect(NON_ASCII.test(non_ascii_id)).toBe(true)

    const encoded_path = `/api/guides/${encodeURIComponent(non_ascii_id)}.json`
    const raw_path = `/api/guides/${non_ascii_id}.json`

    expect(resolveDetailId(encoded_path)).toBe(non_ascii_id)
    expect(resolveDetailId(raw_path)).toBe(non_ascii_id)
  })

  it('returns null (→ route 404, spec Case 1) for an id that has no published content', async () => {
    const source = await readPublicContentSource()
    const resolved = resolveDetailId('/api/products/does-not-exist.json')

    expect(buildProductDetail(source, resolved)).toBeNull()
    expect(buildGuideDetail(source, resolveDetailId('/api/guides/does-not-exist.json'))).toBeNull()
  })
})
