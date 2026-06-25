import { collectNonEmptyTaxonomyIds } from '../app/utils/published-products/non-empty-taxonomy-ids.ts'
import { readPublishedTaxonomyItems, type TaxonomyContentDirs } from './read-published-taxonomy-items.ts'

// Why: channel 成員來自 published product offers 的 channel_id（products-only，ADR-9）；guide/link 無購買連結
// 不貢獻 channel。對「被 ≥1 published product offer 引用」的 channel 產生 /channel/{id}。
// 與 sitemap 共用 collectNonEmptyTaxonomyIds 的 channel_ids，使路由與 sitemap 非空判定不漂移。
export function buildChannelRoutes(dirs: TaxonomyContentDirs): string[] {
  const { channel_ids } = collectNonEmptyTaxonomyIds(readPublishedTaxonomyItems(dirs))

  return Array.from(channel_ids, (channel_id) => `/channel/${channel_id}`)
}
