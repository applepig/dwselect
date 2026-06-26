import type { TaxonomyItemsSource } from './select-taxonomy-items'

// Why: 「非空 taxonomy 判定」是 route builder（決定哪些 /category、/tag、/brand、/channel 進 prerender）
// 與 sitemap（決定哪些 taxonomy entry 進 sitemap）的共同前提；兩處邏輯必須一致，故抽成單一 helper 避免漂移。
// 輸入須為 published-only 清單——呼叫端負責先過濾 status。
//
// brand 與 tag 共用 tag_ids namespace（ADR-8），但 brand 為 products-only：brand_ids 只從 product 的
// tag_ids 切分（∈ 已知 brands），guide/link 的 tag_ids 不貢獻 brand（與 validator 一致）。tag_ids 仍跨三型別蒐集。
// 兩 namespace 互斥，確保 brand id 不殘留於 /tag。channel 成員來自 product offers 的 channel_id（products-only，ADR-9）。

export type NonEmptyTaxonomyIds = {
  category_ids: Set<string>
  tag_ids: Set<string>
  brand_ids: Set<string>
  channel_ids: Set<string>
}

export type CollectNonEmptyTaxonomyOptions = {
  brand_ids?: Set<string>
}

export function collectNonEmptyTaxonomyIds(
  source: TaxonomyItemsSource,
  options: CollectNonEmptyTaxonomyOptions = {},
): NonEmptyTaxonomyIds {
  const known_brand_ids = options.brand_ids ?? new Set<string>()
  const category_ids = new Set<string>()
  const referenced_tag_ids = new Set<string>()
  // brand 切分只看 product 的 tag_ids（products-only）；故與跨型別的 referenced_tag_ids 分開蒐集。
  const product_tag_ids = new Set<string>()
  const channel_ids = new Set<string>()

  for (const product of source.products) {
    category_ids.add(product.category_id)
    addAll(referenced_tag_ids, product.tag_ids)
    addAll(product_tag_ids, product.tag_ids)
    addAll(channel_ids, product.channel_ids)
  }

  for (const guide of source.guides) {
    addAll(category_ids, guide.category_ids)
    addAll(referenced_tag_ids, guide.tag_ids)
  }

  for (const link of source.links) {
    addAll(category_ids, link.category_ids)
    addAll(referenced_tag_ids, link.tag_ids)
  }

  const tag_ids = new Set<string>()
  const brand_ids = new Set<string>()

  // tag_ids：跨三型別的引用，扣掉已知 brand（brand 不入 /tag，即使只被 guide/link 引用）。
  for (const id of referenced_tag_ids) {
    if (!known_brand_ids.has(id)) {
      tag_ids.add(id)
    }
  }

  // brand_ids：只有被 product 以 tag_ids 引用、且 ∈ 已知 brands 的 id（products-only）。
  for (const id of product_tag_ids) {
    if (known_brand_ids.has(id)) {
      brand_ids.add(id)
    }
  }

  return { category_ids, tag_ids, brand_ids, channel_ids }
}

function addAll(target: Set<string>, ids: string[]) {
  for (const id of ids) {
    target.add(id)
  }
}
