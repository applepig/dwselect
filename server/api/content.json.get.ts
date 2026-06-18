import { readPublicContentSource } from '../../scripts/content-reader.ts'
import { buildPublicContentPayload } from '../../scripts/public-content.ts'

// Public content API：dev、generate（prerender）與 production static 同源。
// 直接從 Git-backed content/ 讀取並產生 frontend-ready payload；JSON 不合法或 schema 不過會 throw → 500。
export default defineEventHandler(async (event) => {
  const source = await readPublicContentSource()

  setHeader(event, 'content-type', 'application/json; charset=utf-8')

  return buildPublicContentPayload(source)
})
