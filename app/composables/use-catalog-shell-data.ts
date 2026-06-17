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
      product_breadcrumb_items_by_id: Object.fromEntries(Object.values(content_payload.value.products.details_by_id).map((detail) => [
        detail.id,
        {
          name: detail.name,
          category_id: detail.category_id,
          category_label: detail.category_label,
        },
      ])),
    }
  })
}
