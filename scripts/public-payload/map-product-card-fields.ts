import type { Product } from '../../app/utils/product-schema.ts'
import type { ProductCardView, RelatedProductCardView } from '../../app/utils/public-content-view-types.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import { getPrimaryOffer } from '../../app/utils/content/primary-offer.ts'
import { resolveProductImageUrl } from '../../app/utils/content-images/resolve-product-image-url.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

type ProductCardFields = Pick<
  ProductCardView,
  'id' | 'name' | 'image_url' | 'category_label' | 'channel_id' | 'channel_label' | 'price_label' | 'tag_labels'
>

export function mapProductCardBase(product: Product, labels: TaxonomyLabelResolver): RelatedProductCardView {
  const primary_offer = getPrimaryOffer(product)

  return {
    id: extractContentId(product.id),
    name: product.name,
    image_url: resolveProductImageUrl(product),
    category_label: labels.getCategoryLabel(product.category_id),
    channel_label: labels.getChannelLabel(primary_offer.channel_id),
  }
}

export function mapProductCardFields(product: Product, labels: TaxonomyLabelResolver): ProductCardFields {
  const primary_offer = getPrimaryOffer(product)

  return {
    ...mapProductCardBase(product, labels),
    channel_id: primary_offer.channel_id,
    price_label: primary_offer.price_text,
    tag_labels: product.tag_ids.map((tag_id) => labels.getProductTagLabel(tag_id)),
  }
}
