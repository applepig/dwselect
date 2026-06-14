import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Why: prerender 清單必須與 detail 頁的 published-only 取資料邏輯同源，否則新增
// 非 published 商品時 generate 會把它排進 prerender 而撞 404、使 build 失敗。
export function buildProductRoutes(products_dir: string): string[] {
  return readdirSync(products_dir)
    .filter((file_name) => file_name.endsWith('.json'))
    .filter((file_name) => isPublished(join(products_dir, file_name)))
    .map((file_name) => `/products/${file_name.replace(/\.json$/, '')}`)
}

function isPublished(file_path: string): boolean {
  const product = JSON.parse(readFileSync(file_path, 'utf8')) as { status?: string }

  return product.status === 'published'
}
