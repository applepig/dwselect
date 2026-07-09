import { readPublishedContentStems } from './content-source/read-published-content-stems.ts'

// Why: prerender 清單必須與 guide detail 頁的 published-only 取資料邏輯同源，否則新增
// 非 published 指南時 generate 會把它排進 prerender 而撞 404、使 build 失敗。
//
// route stem 直接取自檔名（= content id），對齊 buildProductRoutes 的既有行為。content id 已於 schema
// 強制為 ASCII kebab（AC1c／ADR-11），故 stem 全為 ASCII、無需 encodeURIComponent。
export function buildGuideRoutes(guides_dir: string): string[] {
  return readPublishedContentStems(guides_dir).map((stem) => `/guide/${stem}`)
}
