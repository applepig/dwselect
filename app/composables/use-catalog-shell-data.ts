import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'
import { getSelectableCategoryIds } from '../utils/published-products/selectable-category-ids'

// 028 拆分：shell 不再傳出全量 detail（detail 改 per-id route）。
// 麵包屑只需精簡欄位，故從瘦身後 payload 的 cards／rows 建立 lookup：
// product id → { name, category_id, category_label }；guide id → { title }。零新資料。
export async function useCatalogShellData() {
  const { data: content_payload } = await useAsyncData('public-content', fetchPublicContentPayload)

  return computed(() => {
    if (content_payload.value === null || content_payload.value === undefined) {
      return null
    }

    const product_breadcrumb_by_id: Record<string, { name: string, category_id: string, category_label: string }> = {}
    for (const card of content_payload.value.products.cards) {
      product_breadcrumb_by_id[card.id] = {
        name: card.name,
        category_id: card.category_id,
        category_label: card.category_label,
      }
    }

    const guide_breadcrumb_by_id: Record<string, { title: string }> = {}
    for (const row of content_payload.value.guides.rows) {
      guide_breadcrumb_by_id[row.id] = { title: row.title }
    }

    return {
      counts: {
        published: content_payload.value.navigation.counts.products,
      },
      desktop_category_items: content_payload.value.navigation.desktop_category_items,
      // 共用 CategoryChipBar 在首頁與分類頁取用同一份 chip 資料（單一來源，零新 fetch）。
      category_chips: content_payload.value.navigation.category_chips,
      category_ids: getSelectableCategoryIds(content_payload.value.navigation.category_chips),
      product_breadcrumb_by_id,
      guide_breadcrumb_by_id,
      // taxonomy 頁（/category|tag|brand|channel/{id}）的 breadcrumb 需要在 layout 解析 label，
      // 沿用 payload 既有的 taxonomies（SSR/prerender 安全，同一 useAsyncData 載入後共用）。
      taxonomies: content_payload.value.taxonomies,
    }
  })
}
