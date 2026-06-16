import type { Product } from '../../app/utils/product-schema.ts'
import type { RelatedProductCardView } from '../../app/utils/public-content-view-types.ts'
import { compareNullableTimestampDesc } from '../../app/utils/content/compare-nullable-timestamp-desc.ts'
import { compareText } from '../../app/utils/content/compare-text.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import { getPrimaryOffer } from '../../app/utils/content/primary-offer.ts'
import { resolveProductImageUrl } from '../../app/utils/content-images/resolve-product-image-url.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

const RELATED_PRODUCT_LIMIT = 3

export function getRelatedProductCards(
  current_product: Product,
  products: Product[],
  labels: TaxonomyLabelResolver,
): RelatedProductCardView[] {
  const current_product_id = extractContentId(current_product.id)

  return products
    .filter((product) => product.status === 'published')
    .filter((product) => extractContentId(product.id) !== current_product_id)
    .toSorted((left_product, right_product) => compareRelatedProducts(current_product, left_product, right_product))
    .slice(0, RELATED_PRODUCT_LIMIT)
    .map((product) => mapRelatedProductCard(product, labels))
}

function mapRelatedProductCard(product: Product, labels: TaxonomyLabelResolver): RelatedProductCardView {
  const primary_offer = getPrimaryOffer(product)

  return {
    id: extractContentId(product.id),
    name: product.name,
    image_url: resolveProductImageUrl(product),
    category_label: labels.getCategoryLabel(product.category_id),
    channel_label: labels.getChannelLabel(primary_offer.channel_id),
  }
}

function compareRelatedProducts(current_product: Product, left_product: Product, right_product: Product) {
  const left_score = getRelatedProductScore(current_product, left_product)
  const right_score = getRelatedProductScore(current_product, right_product)

  if (left_score.same_category !== right_score.same_category) {
    return Number(right_score.same_category) - Number(left_score.same_category)
  }

  if (left_score.shared_tag_count !== right_score.shared_tag_count) {
    return right_score.shared_tag_count - left_score.shared_tag_count
  }

  if (left_score.same_channel !== right_score.same_channel) {
    return Number(right_score.same_channel) - Number(left_score.same_channel)
  }

  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_product.name, right_product.name)
}

function getRelatedProductScore(current_product: Product, candidate_product: Product) {
  const current_tag_ids = new Set(current_product.tag_ids)
  const shared_tag_count = candidate_product.tag_ids
    .filter((tag_id) => current_tag_ids.has(tag_id))
    .length

  return {
    same_category: candidate_product.category_id === current_product.category_id,
    shared_tag_count,
    same_channel: getPrimaryOffer(candidate_product).channel_id === getPrimaryOffer(current_product).channel_id,
  }
}
