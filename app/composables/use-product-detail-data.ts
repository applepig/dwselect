import type { ProductDetailView } from '../utils/public-content-view-types'
import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'

export async function useProductDetailData(product_id: string) {
  const { data: content_payload } = await useAsyncData('public-content', fetchPublicContentPayload)

  return computed<ProductDetailView | null>(() => content_payload.value?.products.details_by_id[product_id] ?? null)
}
