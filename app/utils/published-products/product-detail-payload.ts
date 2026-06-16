import type { PublicContentPayload } from '../public-content-payload'
import type { ProductDetailView } from './types'
import { extractContentId } from '../content/extract-content-id'
import { getProductDetail, getRelatedProductCards } from './product-detail'

export type ProductDetailPayload = {
  product_detail: ProductDetailView
}

export function getProductDetailPayload(
  content_payload: Pick<PublicContentPayload, 'products' | 'taxonomies'>,
  product_id: string,
): ProductDetailPayload | null {
  const matched_product = content_payload.products.find((product) => extractContentId(product.id) === product_id) ?? null

  if (matched_product === null) {
    return null
  }

  return {
    product_detail: {
      ...getProductDetail(matched_product, content_payload.taxonomies),
      related_products: getRelatedProductCards(matched_product, content_payload.products, content_payload.taxonomies)
        .slice(0, 3)
        .map((related_product) => ({
          ...related_product,
          description: null,
          purchase_link: '',
        })),
    },
  }
}
