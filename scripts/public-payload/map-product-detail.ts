import type { Product } from '../../app/utils/product-schema.ts'
import type { ProductDetailView } from '../../app/utils/public-content-view-types.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import { getPrimaryOffer } from '../../app/utils/content/primary-offer.ts'
import { resolveProductImageUrl } from '../../app/utils/content-images/resolve-product-image-url.ts'
import { getRelatedProductCards } from './map-related-product-card.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

const DETAIL_FINE_PRINT = '價格與庫存以通路頁面為準。'

export function mapProductDetail(
  product: Product,
  all_products: Product[],
  labels: TaxonomyLabelResolver,
): ProductDetailView {
  const primary_offer = getPrimaryOffer(product)

  return {
    id: extractContentId(product.id),
    name: product.name,
    summary: product.summary,
    long_description: product.long_description,
    llm_description: product.llm_description,
    hero_image_url: resolveProductImageUrl(product),
    hero_alt: product.name,
    category_id: product.category_id,
    category_label: labels.getCategoryLabel(product.category_id),
    channel_id: primary_offer.channel_id,
    channel_label: labels.getChannelLabel(primary_offer.channel_id),
    tag_labels: product.tag_ids.map((tag_id) => labels.getProductTagLabel(tag_id)),
    price_label: primary_offer.price.label ?? primary_offer.price_text,
    buy_url: primary_offer.url,
    fine_print: DETAIL_FINE_PRINT,
    related_products: getRelatedProductCards(product, all_products, labels),
  }
}
