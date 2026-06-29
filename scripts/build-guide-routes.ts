import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Why: prerender 清單必須與 guide detail 頁的 published-only 取資料邏輯同源，否則新增
// 非 published 指南時 generate 會把它排進 prerender 而撞 404、使 build 失敗。
//
// route stem 直接取自檔名（= content id），對齊 buildProductRoutes 的既有行為。content id 已於 schema
// 強制為 ASCII kebab（AC1c／ADR-11），故 stem 全為 ASCII、無需 encodeURIComponent。
export function buildGuideRoutes(guides_dir: string): string[] {
  return readdirSync(guides_dir)
    .filter((file_name) => file_name.endsWith('.json'))
    .filter((file_name) => isPublished(join(guides_dir, file_name)))
    .map((file_name) => `/guide/${file_name.replace(/\.json$/, '')}`)
}

function isPublished(file_path: string): boolean {
  const guide = JSON.parse(readFileSync(file_path, 'utf8')) as { status?: string }

  return guide.status === 'published'
}
