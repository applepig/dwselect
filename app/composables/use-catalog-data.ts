import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'

export async function useCatalogData() {
  const { data: content_payload } = await useAsyncData('public-content', fetchPublicContentPayload)

  const category_ids = computed(() => content_payload.value?.taxonomies.categories.map((category) => category.id) ?? [])

  return {
    content_payload,
    category_ids,
  }
}
