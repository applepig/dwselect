import type { TaxonomyLabelResolver } from './taxonomy-labels.ts'

// detail 頁的 tag_ids 混著 brand id（如 panasonic），brand 已搬到 /brand/{id} 專屬前綴（ADR-8）。
// 把 tag_ids 依 brands.json 成員切成兩組互斥清單：brand id → brands（→/brand）、其餘 → tags（→/tag），
// 避免 brand pill 連到不再生成的 /tag/{brand} 死路由（AC24b）。各組維持原始撰寫順序，id 與 label 同序配對。
export type DetailTaxonomyTagGroups = {
  tag_ids: string[]
  tag_labels: string[]
  brand_ids: string[]
  brand_labels: string[]
}

export function splitDetailTaxonomyTags(
  tag_ids: string[],
  labels: TaxonomyLabelResolver,
): DetailTaxonomyTagGroups {
  const groups: DetailTaxonomyTagGroups = {
    tag_ids: [],
    tag_labels: [],
    brand_ids: [],
    brand_labels: [],
  }

  for (const id of tag_ids) {
    if (labels.isBrandId(id)) {
      groups.brand_ids.push(id)
      groups.brand_labels.push(labels.getTaxonomyTagLabel(id))

      continue
    }

    groups.tag_ids.push(id)
    groups.tag_labels.push(labels.getContentTagLabel(id))
  }

  return groups
}
