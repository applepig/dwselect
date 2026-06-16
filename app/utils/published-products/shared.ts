import type { Product, ProductOffer } from '../product-schema'
import type { PublishedProductCard, TaxonomyDefinitions } from './types'
import { compareProducts } from '../content/compare-products'
import { extractContentId } from '../content/extract-content-id'
import { getPrimaryOffer } from '../content/primary-offer'
import { resolveProductImageUrl } from '../content-images/resolve-product-image-url'

export function getPublishedProducts(
  products: Product[],
  taxonomies: TaxonomyDefinitions,
): PublishedProductCard[] {
  return products
    .filter((product) => product.status === 'published')
    .toSorted((left_product, right_product) => compareProducts(left_product, right_product, taxonomies))
    .map((product) => mapProductToCard(product, taxonomies))
}

export function mapProductToCard(product: Product, taxonomies: TaxonomyDefinitions): PublishedProductCard {
  const category_definition = getCategoryDefinition(product.category_id, taxonomies)
  const primary_offer = getPrimaryOffer(product)
  const channel_definition = getChannelDefinition(primary_offer.channel_id, taxonomies)

  return {
    id: extractContentId(product.id),
    category: category_definition.label,
    category_id: product.category_id,
    channel: channel_definition.label,
    channel_id: primary_offer.channel_id,
    description: product.long_description,
    image: resolveProductImageUrl(product),
    name: product.name,
    price: primary_offer.price_text,
    purchase_link: primary_offer.url,
    published_at: product.published_at,
    summary: product.summary,
    tags: getProductTagLabels(product.tag_ids, taxonomies),
  }
}

export function getCategoryDefinition(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions) {
  return taxonomies.categories.find((category) => category.id === category_id) ?? {
    id: category_id,
    label: category_id,
    short_label: category_id,
    nav_visible: false,
    sort_order: Number.MAX_SAFE_INTEGER,
  }
}

export function getChannelDefinition(channel_id: ProductOffer['channel_id'], taxonomies: TaxonomyDefinitions) {
  return taxonomies.channels.find((channel) => channel.id === channel_id) ?? {
    id: channel_id,
    label: channel_id,
    tint: 'neutral',
    host_patterns: [],
    sort_order: Number.MAX_SAFE_INTEGER,
  }
}

export function getCategorySortOrder(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions) {
  return getCategoryDefinition(category_id, taxonomies).sort_order
}

export function getProductTagLabels(tag_ids: string[], taxonomies: TaxonomyDefinitions) {
  return tag_ids.map((tag_id) => getProductTagLabel(tag_id, taxonomies))
}

export function getProductTagLabel(tag_id: string, taxonomies: TaxonomyDefinitions) {
  return taxonomies.tags.find((tag) => tag.id === tag_id)?.label
    ?? taxonomies.brands.find((brand) => brand.id === tag_id)?.label
    ?? tag_id
}

export function getContentTagLabel(tag_id: string, taxonomies: TaxonomyDefinitions) {
  return taxonomies.tags.find((tag) => tag.id === tag_id)?.label ?? tag_id
}
