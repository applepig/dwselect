import type { TaxonomyKind } from '../utils/published-products/select-taxonomy-items'
import type { TaxonomyPageData } from '../utils/published-products/types'
import { buildTaxonomyPageData } from '../utils/published-products/build-taxonomy-page-data'
import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'

// taxonomy 頁的資料流：fetch public payload（cards／guides.rows／links 皆已 published＋排序）
// → buildTaxonomyPageData 依 kind＋id 篩各型別子集並解析標題／簡介 → 回 TaxonomyPageData｜null（null＝該丟 404）。
// kind 含 brand／channel 的 alias mode（ADR-10），由 buildTaxonomyPageData 內部映射 predicate 與 label 來源。
export async function useTaxonomyPageData(kind: TaxonomyKind, taxonomy_id: string) {
  const { data: content_payload } = await useAsyncData('public-content', fetchPublicContentPayload)

  return computed<TaxonomyPageData | null>(() => {
    const payload = content_payload.value

    if (payload === null || payload === undefined) {
      return null
    }

    return buildTaxonomyPageData(
      {
        products: payload.products.cards,
        guides: payload.guides.rows,
        links: payload.links,
        taxonomies: payload.taxonomies,
      },
      { kind, id: taxonomy_id },
    )
  })
}
