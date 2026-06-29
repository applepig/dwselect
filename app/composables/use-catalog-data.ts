import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'
import { getSelectableCategoryIds } from '../utils/published-products/selectable-category-ids'

export async function useCatalogData() {
  const { data: content_payload } = await useAsyncData('public-content', fetchPublicContentPayload)

  const category_ids = computed(() => {
    const category_chips = content_payload.value?.navigation.category_chips

    if (category_chips === undefined) {
      return new Set<string>()
    }

    return new Set(getSelectableCategoryIds(category_chips))
  })

  return {
    content_payload,
    category_ids,
  }
}
