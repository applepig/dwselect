import type { PublicContentPayload } from '../utils/public-content-payload'
import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'
import { getProductDetailPayload } from '../utils/published-products/product-detail-payload'

export async function useProductDetailData(product_id: string) {
  const { data: product_detail_data } = await useAsyncData(
    `product-detail-${product_id}`,
    fetchPublicContentPayload,
    {
      transform: (content_payload) => getProductDetailPayload(content_payload as PublicContentPayload, product_id),
    },
  )

  return product_detail_data
}
