import { collectNonEmptyTaxonomyIds } from '../app/utils/published-products/non-empty-taxonomy-ids.ts'
import { readPublishedTaxonomyItems, type TaxonomyContentDirs } from './read-published-taxonomy-items.ts'

// Why: 對「至少 1 筆 published 關聯項目」的 category 產生 /category/{id} prerender 路由——
// 與 build-product-routes 同源（published-only），避免空 taxonomy 排進 prerender 撞 404。
// 非空判定跨三型別（product 單數 category_id + guide/link 複數 category_ids），與 sitemap 共用同一 helper。
//
// taxonomy id 由 taxonomy_id_schema 強制 ASCII kebab-case，route stem 安全、無需 encodeURIComponent。
export function buildCategoryRoutes(dirs: TaxonomyContentDirs): string[] {
  const { category_ids } = collectNonEmptyTaxonomyIds(readPublishedTaxonomyItems(dirs))

  return Array.from(category_ids, (category_id) => `/category/${category_id}`)
}
