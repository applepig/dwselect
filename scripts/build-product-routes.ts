import { readPublishedContentStems } from './content-source/read-published-content-stems.ts'

// Why: prerender 清單必須與 detail 頁的 published-only 取資料邏輯同源，否則新增
// 非 published 商品時 generate 會把它排進 prerender 而撞 404、使 build 失敗。
export function buildProductRoutes(products_dir: string): string[] {
  return readPublishedContentStems(products_dir).map((stem) => `/products/${stem}`)
}
