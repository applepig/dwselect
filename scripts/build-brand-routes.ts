import { collectNonEmptyTaxonomyIds } from '../app/utils/published-products/non-empty-taxonomy-ids.ts'
import { readBrandIds, readPublishedTaxonomyItems, type TaxonomyContentDirs } from './read-published-taxonomy-items.ts'

// Why: brand 與 tag 共用 tag_ids namespace 與 membership predicate（ADR-8），但對外走專屬 /brand/{id} 前綴、
// 單一 canonical（ADR-10）。對「至少 1 筆 published 項目以 tag_ids 引用、且該 id ∈ brands.json」的 brand
// 產生 /brand/{id}。與 build-tag-routes 共用 collectNonEmptyTaxonomyIds 的同一切分，確保兩 namespace 互斥。
export function buildBrandRoutes(dirs: TaxonomyContentDirs): string[] {
  const brand_ids = readBrandIds(dirs.taxonomies_dir)
  const collected = collectNonEmptyTaxonomyIds(readPublishedTaxonomyItems(dirs), { brand_ids })

  return Array.from(collected.brand_ids, (brand_id) => `/brand/${brand_id}`)
}
