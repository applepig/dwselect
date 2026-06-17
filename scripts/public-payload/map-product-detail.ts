import type { Product } from '../../app/utils/product-schema.ts'
import type { ProductDetailView } from '../../app/utils/public-content-view-types.ts'
import { getPrimaryOffer } from '../../app/utils/content/primary-offer.ts'
import { mapProductCardFields } from './map-product-card-fields.ts'
import { getRelatedProductCards } from './map-related-product-card.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

const DETAIL_FINE_PRINT = '價格與庫存以通路頁面為準。'

export function mapProductDetail(
  product: Product,
  all_products: Product[],
  labels: TaxonomyLabelResolver,
): ProductDetailView {
  const { image_url, ...card_fields } = mapProductCardFields(product, labels)

  return {
    ...card_fields,
    summary: product.summary,
    long_description: product.long_description,
    llm_description: product.llm_description,
    hero_image_url: image_url,
    hero_alt: product.name,
    category_id: product.category_id,
    buy_url: getPrimaryOffer(product).url,
    fine_print: DETAIL_FINE_PRINT,
    related_products: getRelatedProductCards(product, all_products, labels),
  }
}
