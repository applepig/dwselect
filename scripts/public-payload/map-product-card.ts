import type { Product } from '../../app/utils/product-schema.ts'
import type { ProductCardView } from '../../app/utils/public-content-view-types.ts'
import { mapProductCardFields } from './map-product-card-fields.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

export function mapProductCard(product: Product, labels: TaxonomyLabelResolver): ProductCardView {
  return {
    ...mapProductCardFields(product, labels),
    short_description: product.short_description,
    category_id: product.category_id,
    published_at: product.published_at,
  }
}
