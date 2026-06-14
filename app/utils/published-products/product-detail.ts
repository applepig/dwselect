import type { Product } from '../product-schema'
import type { ProductDetailView, PublishedProductCard, TaxonomyDefinitions } from './types'
import { resolveProductImageUrl } from '../content-images/resolve-product-image-url'
import { compareText, getCategoryDefinition, getChannelDefinition, getPrimaryOffer, getProductTagLabels, mapProductToCard } from './shared'

export function getProductDetail(
  product: Product,
  taxonomies: TaxonomyDefinitions,
): ProductDetailView {
  const primary_offer = getPrimaryOffer(product)
  const channel_definition = getChannelDefinition(primary_offer.channel_id, taxonomies)
  const category_definition = getCategoryDefinition(product.category_id, taxonomies)
  const price_label = primary_offer.price.label ?? primary_offer.price_text

  return {
    id: getCatalogProductId(product),
    title: product.name,
    hero_image: resolveProductImageUrl(product),
    hero_alt: product.name,
    channel_label: channel_definition.label,
    channel_id: primary_offer.channel_id,
    category_label: category_definition.label,
    price_label,
    dw_says: product.summary,
    description: product.long_description === product.summary ? null : product.long_description,
    tags: getProductTagLabels(product.tag_ids, taxonomies),
    buy_cta: {
      label: `到 ${channel_definition.label} 購買`,
      href: primary_offer.url,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    fine_print: '價格與庫存以通路頁面為準。',
    related_products: [],
  }
}

export function getRelatedProductCards(
  current_product: Product,
  products: Product[],
  taxonomies: TaxonomyDefinitions,
): PublishedProductCard[] {
  const current_product_id = getCatalogProductId(current_product)

  return products
    .filter((product) => product.status === 'published')
    .filter((product) => getCatalogProductId(product) !== current_product_id)
    .toSorted((left_product, right_product) => compareRelatedProducts(current_product, left_product, right_product))
    .map((product) => mapProductToCard(product, taxonomies))
}

export function getCatalogProductId(product: Pick<Product, 'id'>): string {
  return product.id
    .split('/')
    .at(-1)
    ?.replace(/\.json$/, '') ?? product.id
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

function compareNullableTimestampDesc(left_value: string | null, right_value: string | null) {
  if (left_value === right_value) {
    return 0
  }

  if (left_value === null) {
    return 1
  }

  if (right_value === null) {
    return -1
  }

  return right_value.localeCompare(left_value)
}
