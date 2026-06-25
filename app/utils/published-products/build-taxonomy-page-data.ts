// Why: taxonomy 瀏覽頁需把「已 published、已排序的 payload 卡片／rows」依 taxonomy id 篩成各型別子集，
// 並解析標題（label）與 tag 簡介（description）。輸入即公開 payload 的 cards／guides.rows／links + taxonomies，
// 全部 build-time 已過 published 過濾與既有排序慣例，本函式只負責「依 id 篩選 + 解析標題」，不重排。

import type { ProductCardView } from '../public-content-view-types'
import { createTaxonomyLabelResolver, type TaxonomyLabelSource } from '../content/taxonomy-labels'
import { selectPublishedTaxonomyItems, type TaxonomySelector } from './select-taxonomy-items'
import type { CompactResourceRow, TaxonomyPageData } from './types'

export type TaxonomyPageInput = {
  products: ProductCardView[]
  guides: CompactResourceRow[]
  links: CompactResourceRow[]
  taxonomies: TaxonomyLabelSource
}

export function buildTaxonomyPageData(
  input: TaxonomyPageInput,
  selector: TaxonomySelector,
): TaxonomyPageData | null {
  // ADR-10 single-canonical invariant：先驗 selector.id 屬於 selector.kind 的 namespace，不符即 404。
  // brand 與 tag 共用 tag_ids membership predicate，僅靠 selectPublishedTaxonomyItems 無法分辨
  // /tag/{brand-id} 與 /brand/{tag-id}；route builder 的切分只擋 prerender 清單，擋不住 runtime 直接／客端訪問。
  if (!isSelectorIdInNamespace(input.taxonomies, selector)) {
    return null
  }

  const selected = selectPublishedTaxonomyItems(
    {
      products: input.products,
      guides: input.guides.map(toTaxonomyResourceItem),
      links: input.links.map(toTaxonomyResourceItem),
    },
    selector,
  )

  // 三型別全空（含 taxonomy id 不存在）→ 回 null，呼叫端據此丟 404，不渲染空白頁。
  if (selected.products.length === 0 && selected.guides.length === 0 && selected.links.length === 0) {
    return null
  }

  const labels = createTaxonomyLabelResolver(input.taxonomies)

  return {
    taxonomy_kind: selector.kind,
    id: selector.id,
    label: resolveLabel(labels, selector),
    description: resolveDescription(labels, selector),
    products: selected.products,
    guides: selected.guides,
    links: selected.links,
  }
}

// namespace 成員資格：category→categories、channel→channels、brand→brands、tag→tags。
// tag 多一層保險：brands namespace 的 id 不得走 tag 前綴（tags/brands namespace 互斥，ADR-8）。
function isSelectorIdInNamespace(taxonomies: TaxonomyLabelSource, selector: TaxonomySelector): boolean {
  if (selector.kind === 'category') {
    return taxonomies.categories.some((category) => category.id === selector.id)
  }

  if (selector.kind === 'channel') {
    return taxonomies.channels.some((channel) => channel.id === selector.id)
  }

  if (selector.kind === 'brand') {
    return taxonomies.brands.some((brand) => brand.id === selector.id)
  }

  const in_tags = taxonomies.tags.some((tag) => tag.id === selector.id)
  const in_brands = taxonomies.brands.some((brand) => brand.id === selector.id)

  return in_tags && !in_brands
}

// guide／link rows 的 taxonomy ids 為 optional（search 結果 row 不帶）；taxonomy 頁的 rows 來自 build payload，
// 必帶 ids，缺漏時退回空陣列，使該 row 不被任何 taxonomy 命中。
function toTaxonomyResourceItem(row: CompactResourceRow): CompactResourceRow & { category_ids: string[], tag_ids: string[] } {
  return {
    ...row,
    category_ids: row.category_ids ?? [],
    tag_ids: row.tag_ids ?? [],
  }
}

// label 來源依 kind 映射（ADR-8/9/10）：
// tag→tags（含 brand fallback）、brand→brands、channel→channels.json、category→categories。
function resolveLabel(
  labels: ReturnType<typeof createTaxonomyLabelResolver>,
  selector: TaxonomySelector,
): string {
  if (selector.kind === 'tag' || selector.kind === 'brand') {
    return labels.getTaxonomyTagLabel(selector.id)
  }

  if (selector.kind === 'channel') {
    return labels.getChannelLabel(selector.id)
  }

  return labels.getCategoryLabel(selector.id)
}

// description 只有 tag/brand 有（取含 brand fallback 的 getter，ADR-8）；category 與 channel 無 description
// （ADR-6／ADR-9），不顯示簡介段。空字串視同無。
function resolveDescription(
  labels: ReturnType<typeof createTaxonomyLabelResolver>,
  selector: TaxonomySelector,
): string | null {
  if (selector.kind === 'tag' || selector.kind === 'brand') {
    return labels.getTaxonomyTagDescription(selector.id)
  }

  return null
}
