import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'

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
      category_ids: content_payload.value.taxonomies.categories.map((category) => category.id),
    }
  })
}
