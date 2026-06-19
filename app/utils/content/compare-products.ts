import type { Product } from '../product-schema.ts'
import type { TaxonomyDefinitions } from '../published-products/types.ts'
import { compareNullableTimestampDesc } from './compare-nullable-timestamp-desc.ts'
import { compareText } from './compare-text.ts'

export function compareProducts(
  left_product: Product,
  right_product: Product,
  taxonomies: TaxonomyDefinitions,
): number {
  const category_order = getCategorySortOrder(left_product.category_id, taxonomies)
    - getCategorySortOrder(right_product.category_id, taxonomies)

  if (category_order !== 0) {
    return category_order
  }

  const updated_at_order = compareNullableTimestampDesc(left_product.updated_at, right_product.updated_at)

  if (updated_at_order !== 0) {
    return updated_at_order
  }

  return compareText(left_product.name, right_product.name)
}

function getCategorySortOrder(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions): number {
  return taxonomies.categories.find((category) => category.id === category_id)?.sort_order
    ?? Number.MAX_SAFE_INTEGER
}
