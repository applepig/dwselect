import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Why: prerender 清單必須與 guide detail 頁的 published-only 取資料邏輯同源，否則新增
// 非 published 指南時 generate 會把它排進 prerender 而撞 404、使 build 失敗。
//
// CJK id（如 2026-06-02-日本米入門篇）原樣保留為 route stem，對齊 buildProductRoutes 的既有行為——
// stem 直接取自檔名、不做 encodeURIComponent，nitro static prerender 以相同方式處理 unicode route。
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
