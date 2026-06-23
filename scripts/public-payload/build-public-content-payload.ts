import type { Guide, Product } from '../../app/utils/product-schema.ts'
import type { GuideDetailView, ProductDetailView } from '../../app/utils/public-content-view-types.ts'
import type { PublicContentPayload } from '../../app/utils/public-content-payload.ts'
import { compareGuides } from '../../app/utils/content/compare-guides.ts'
import { compareProducts } from '../../app/utils/content/compare-products.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import type { PublicContentSource } from '../content-reader.ts'
import { PUBLIC_CONTENT_VERSION, SITE_NAME, SITE_URL, isPublished } from '../public-content.ts'
import { buildNavigation } from './build-navigation.ts'
import { mapGuideDetail } from './map-guide-detail.ts'
import { mapGuideRows, mapLinkRows } from './map-resource-rows.ts'
import { mapProductCard } from './map-product-card.ts'
import { mapProductDetail } from './map-product-detail.ts'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

export function buildPublicContentPayload(source: PublicContentSource): PublicContentPayload {
  const labels = createTaxonomyLabelResolver(source.taxonomies)
  const published_products = source.products.filter(isPublished)
  const sorted_products = published_products
    .toSorted((left_product, right_product) => compareProducts(left_product, right_product, source.taxonomies))
  const published_guides = source.guides.filter(isPublished)
  const sorted_guides = published_guides.toSorted(compareGuides)

  return {
    version: PUBLIC_CONTENT_VERSION,
    site: {
      name: SITE_NAME,
      url: SITE_URL,
    },
    products: {
      cards: sorted_products.map((product) => mapProductCard(product, labels)),
      details_by_id: buildDetailsById(sorted_products, published_products, labels),
    },
    guides: {
      rows: mapGuideRows(source.guides, labels),
      details_by_id: buildGuideDetailsById(sorted_guides, published_products, labels),
    },
    links: mapLinkRows(source.links),
    navigation: buildNavigation(
      { products: source.products, guides: source.guides, links: source.links },
      source.taxonomies,
    ),
    taxonomies: {
      categories: sortTaxonomies(source.taxonomies.categories),
      channels: sortTaxonomies(source.taxonomies.channels),
      tags: sortTaxonomies(source.taxonomies.tags),
      brands: sortTaxonomies(source.taxonomies.brands),
    },
  }
}

function buildDetailsById(
  sorted_products: Product[],
  published_products: Product[],
  labels: ReturnType<typeof createTaxonomyLabelResolver>,
): Record<string, ProductDetailView> {
  const details_by_id: Record<string, ProductDetailView> = {}

  for (const product of sorted_products) {
    details_by_id[extractContentId(product.id)] = mapProductDetail(product, published_products, labels)
  }

  return details_by_id
}

function buildGuideDetailsById(
  sorted_guides: Guide[],
  published_products: Product[],
  labels: ReturnType<typeof createTaxonomyLabelResolver>,
): Record<string, GuideDetailView> {
  const details_by_id: Record<string, GuideDetailView> = {}

  for (const guide of sorted_guides) {
    details_by_id[extractContentId(guide.id)] = mapGuideDetail(guide, published_products, labels)
  }

  return details_by_id
}

function sortTaxonomies<T extends { id: string, sort_order: number }>(items: T[]) {
  return [...items].toSorted((left_item, right_item) => {
    const sort_order_diff = left_item.sort_order - right_item.sort_order

    if (sort_order_diff !== 0) {
      return sort_order_diff
    }

    return left_item.id.localeCompare(right_item.id)
  })
}
