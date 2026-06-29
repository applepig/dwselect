import { collectNonEmptyTaxonomyIds } from '../app/utils/published-products/non-empty-taxonomy-ids.ts'
import { readBrandIds, readPublishedTaxonomyItems, type TaxonomyContentDirs } from './read-published-taxonomy-items.ts'

// Why: 對「至少 1 筆 published 關聯項目」的 tag 產生 /tag/{id} prerender 路由——三型別皆以 tag_ids 關聯。
// 與 build-category-routes 共用 collectNonEmptyTaxonomyIds，使路由與 sitemap 的非空判定不漂移。
// brand id（∈ brands.json）走專屬 /brand/ 前綴（ADR-8），故自 /tag 清單剔除：傳入已知 brand id 集合，
// 由 collectNonEmptyTaxonomyIds 把 brand id 從 tag_ids 切出。taxonomies_dir 未提供時不做切分（向後相容）。
export function buildTagRoutes(dirs: TaxonomyContentDirs): string[] {
  const brand_ids = readBrandIds(dirs.taxonomies_dir)
  const { tag_ids } = collectNonEmptyTaxonomyIds(readPublishedTaxonomyItems(dirs), { brand_ids })

  return Array.from(tag_ids, (tag_id) => `/tag/${tag_id}`)
}
