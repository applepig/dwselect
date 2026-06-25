import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'
import { getSelectableCategoryIds } from '../utils/published-products/selectable-category-ids'

export async function useCatalogShellData() {
  const { data: content_payload } = await useAsyncData('public-content', fetchPublicContentPayload)

  return computed(() => {
    if (content_payload.value === null || content_payload.value === undefined) {
      return null
    }

    return {
      counts: {
        published: content_payload.value.navigation.counts.products,
      },
      desktop_category_items: content_payload.value.navigation.desktop_category_items,
      category_ids: getSelectableCategoryIds(content_payload.value.navigation.category_chips),
      product_details_by_id: content_payload.value.products.details_by_id,
      guide_details_by_id: content_payload.value.guides.details_by_id,
      // taxonomy 頁（/category|tag|brand|channel/{id}）的 breadcrumb 需要在 layout 解析 label，
      // 沿用 payload 既有的 taxonomies（SSR/prerender 安全，同一 useAsyncData 載入後共用）。
      taxonomies: content_payload.value.taxonomies,
    }
  })
}
