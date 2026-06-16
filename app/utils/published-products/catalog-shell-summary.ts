import type { PublicContentPayload } from '../public-content-payload'
import type { CompactCategoryChip } from './types'
import { getCompactCategoryOptions } from './compact-app'

export type CatalogShellSummary = {
  counts: {
    published: number
  }
  desktop_category_items: CompactCategoryChip[]
  category_ids: string[]
}

export function getCatalogShellSummary(
  content_payload: Pick<PublicContentPayload, 'products' | 'taxonomies'>,
): CatalogShellSummary {
  const published_products = content_payload.products.filter((product) => product.status === 'published')

  return {
    counts: {
      published: published_products.length,
    },
    desktop_category_items: getCompactCategoryOptions(
      published_products,
      'all',
      content_payload.taxonomies,
    ),
    category_ids: content_payload.taxonomies.categories.map((category) => category.id),
  }
}
