import type { Product, ProductOffer } from '../product-schema'
import type { PublishedProductCard, TaxonomyDefinitions } from './types'
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
    id: getProductCardId(product),
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

export function getPrimaryOffer(product: Product): ProductOffer {
  return product.offers[0]!
}

export function getCategorySortOrder(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions) {
  return getCategoryDefinition(category_id, taxonomies).sort_order
}

export function compareText(left_value: string, right_value: string) {
  const left_chars = Array.from(left_value.normalize('NFKC'))
  const right_chars = Array.from(right_value.normalize('NFKC'))
  const length = Math.min(left_chars.length, right_chars.length)

  for (let i = 0; i < length; i += 1) {
    const left_code_point = left_chars[i]?.codePointAt(0) ?? 0
    const right_code_point = right_chars[i]?.codePointAt(0) ?? 0

    if (left_code_point !== right_code_point) {
      return left_code_point - right_code_point
    }
  }

  return left_chars.length - right_chars.length
}

function compareProducts(left_product: Product, right_product: Product, taxonomies: TaxonomyDefinitions) {
  const category_order = getCategorySortOrder(left_product.category_id, taxonomies)
    - getCategorySortOrder(right_product.category_id, taxonomies)

  if (category_order !== 0) {
    return category_order
  }

  return compareProductsByLatest(left_product, right_product)
}

function compareProductsByLatest(left_product: Product, right_product: Product) {
  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_product.name, right_product.name)
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

function getProductCardId(product: Pick<Product, 'id'>): string {
  return product.id
    .split('/')
    .at(-1)
    ?.replace(/\.json$/, '') ?? product.id
}
