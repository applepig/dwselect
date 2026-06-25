import { readPublicContentSource } from '../../../scripts/content-reader.ts'
import { buildGuideDetail } from '../../../scripts/public-payload/build-detail-by-id.ts'
import { extractContentId } from '../../../app/utils/content/extract-content-id.ts'

// per-id guide detail API：與 /api/content.json 同源（dev 動態回應、generate prerender 成 static JSON）。
// 只回該 id 那一筆 GuideDetailView。id 不存在／未發布 → 404（spec Case 1）。
export default defineEventHandler(async (event) => {
  // h3 (rou3) 把檔名 token [id].json 整段當成單一 route param（key 變成 'id.json'、值含副檔名），
  // 故 getRouterParam(event, 'id') 會是 undefined。改從 path 末段去副檔名取 id；decodeURIComponent
  // 處理 dev 模式瀏覽器對 CJK guide id 的百分比編碼（prerender 走原始 unicode，為 no-op）。
  const id = decodeURIComponent(extractContentId(event.path))

  const source = await readPublicContentSource()
  const detail = buildGuideDetail(source, id)

  if (detail === null) {
    throw createError({ statusCode: 404, statusMessage: '找不到指南' })
  }

  setHeader(event, 'content-type', 'application/json; charset=utf-8')

  return detail
})
