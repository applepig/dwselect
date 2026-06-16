import type { Guide, LinkDefinition, Product } from '../utils/product-schema'
import type { TaxonomyDefinitions } from '../utils/published-products/types'
import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'

export async function useCatalogData() {
  const { data: public_content } = await useAsyncData('public-content', fetchPublicContentPayload)

  const all_products = computed<Product[]>(() => public_content.value?.products ?? [])
  const runtime_taxonomies = computed<TaxonomyDefinitions | undefined>(() => public_content.value?.taxonomies)
  const runtime_guides = computed<Guide[] | undefined>(() => public_content.value?.guides)
  const runtime_links = computed<LinkDefinition[] | undefined>(() => public_content.value?.links)

  return {
    all_products,
    runtime_taxonomies,
    runtime_guides,
    runtime_links,
  }
}
