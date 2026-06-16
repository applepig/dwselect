import type { Product } from '../../app/utils/product-schema.ts'
import type { ProductCardView } from '../../app/utils/public-content-view-types.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import { getPrimaryOffer } from '../../app/utils/content/primary-offer.ts'
import { resolveProductImageUrl } from '../../app/utils/content-images/resolve-product-image-url.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

export function mapProductCard(product: Product, labels: TaxonomyLabelResolver): ProductCardView {
  const primary_offer = getPrimaryOffer(product)

  return {
    id: extractContentId(product.id),
    name: product.name,
    summary: product.summary,
    image_url: resolveProductImageUrl(product),
    category_id: product.category_id,
    category_label: labels.getCategoryLabel(product.category_id),
    channel_id: primary_offer.channel_id,
    channel_label: labels.getChannelLabel(primary_offer.channel_id),
    price_label: primary_offer.price.label ?? primary_offer.price_text,
    tag_labels: product.tag_ids.map((tag_id) => labels.getProductTagLabel(tag_id)),
    published_at: product.published_at,
  }
}
