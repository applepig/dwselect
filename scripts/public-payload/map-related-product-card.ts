import type { Product } from '../../app/utils/product-schema.ts'
import type { RelatedProductCardView } from '../../app/utils/public-content-view-types.ts'
import { compareNullableTimestampDesc } from '../../app/utils/content/compare-nullable-timestamp-desc.ts'
import { compareText } from '../../app/utils/content/compare-text.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import { getPrimaryOffer } from '../../app/utils/content/primary-offer.ts'
import { mapProductCardBase } from './map-product-card-fields.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

const RELATED_PRODUCT_LIMIT = 3

interface CurrentProductInvariants {
  tag_ids: Set<string>
  category_id: string
  channel_id: string
}

export function getRelatedProductCards(
  current_product: Product,
  products: Product[],
  labels: TaxonomyLabelResolver,
): RelatedProductCardView[] {
  const current_product_id = extractContentId(current_product.id)
  const current_invariants = getCurrentProductInvariants(current_product)

  return products
    .filter((product) => product.status === 'published')
    .filter((product) => extractContentId(product.id) !== current_product_id)
    .toSorted((left_product, right_product) => compareRelatedProducts(current_invariants, left_product, right_product))
    .slice(0, RELATED_PRODUCT_LIMIT)
    .map((product) => mapProductCardBase(product, labels))
}

function getCurrentProductInvariants(current_product: Product): CurrentProductInvariants {
  return {
    tag_ids: new Set(current_product.tag_ids),
    category_id: current_product.category_id,
    channel_id: getPrimaryOffer(current_product).channel_id,
  }
}

function compareRelatedProducts(current_invariants: CurrentProductInvariants, left_product: Product, right_product: Product) {
  const left_score = getRelatedProductScore(current_invariants, left_product)
  const right_score = getRelatedProductScore(current_invariants, right_product)

  if (left_score.same_category !== right_score.same_category) {
    return Number(right_score.same_category) - Number(left_score.same_category)
  }

  if (left_score.shared_tag_count !== right_score.shared_tag_count) {
    return right_score.shared_tag_count - left_score.shared_tag_count
  }

  if (left_score.same_channel !== right_score.same_channel) {
    return Number(right_score.same_channel) - Number(left_score.same_channel)
  }

  const updated_at_order = compareNullableTimestampDesc(left_product.updated_at, right_product.updated_at)

  if (updated_at_order !== 0) {
    return updated_at_order
  }

  return compareText(left_product.name, right_product.name)
}

function getRelatedProductScore(current_invariants: CurrentProductInvariants, candidate_product: Product) {
  const shared_tag_count = candidate_product.tag_ids
    .filter((tag_id) => current_invariants.tag_ids.has(tag_id))
    .length

  return {
    same_category: candidate_product.category_id === current_invariants.category_id,
    shared_tag_count,
    same_channel: getPrimaryOffer(candidate_product).channel_id === current_invariants.channel_id,
  }
}
