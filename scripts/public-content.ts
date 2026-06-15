import type {
  CategoryDefinition,
  ChannelDefinition,
  Guide,
  LinkDefinition,
  Product,
  TagDefinition,
} from '../app/utils/product-schema.ts'
import type { PublicContentSource } from './content-reader.ts'

export const PUBLIC_CONTENT_VERSION = 1
export const SITE_NAME = 'DW嚴選'
export const SITE_URL = 'https://dwselect.applepig.net/'

export type PublicContentPayload = {
  version: typeof PUBLIC_CONTENT_VERSION
  site: {
    name: typeof SITE_NAME
    url: typeof SITE_URL
  }
  products: Product[]
  guides: Guide[]
  links: LinkDefinition[]
  taxonomies: {
    categories: CategoryDefinition[]
    channels: ChannelDefinition[]
    tags: TagDefinition[]
    brands: TagDefinition[]
  }
}

export function buildPublicContentPayload(source: PublicContentSource): PublicContentPayload {
  return {
    version: PUBLIC_CONTENT_VERSION,
    site: {
      name: SITE_NAME,
      url: SITE_URL,
    },
    products: sortById(source.products.filter(isPublished)),
    guides: sortById(source.guides.filter(isPublished)),
    links: sortById(source.links.filter(isPublished)),
    taxonomies: {
      categories: sortTaxonomies(source.taxonomies.categories),
      channels: sortTaxonomies(source.taxonomies.channels),
      tags: sortTaxonomies(source.taxonomies.tags),
      brands: sortTaxonomies(source.taxonomies.brands),
    },
  }
}

export function isPublished(content: { status: string }) {
  return content.status === 'published'
}

function sortById<T extends { id: string }>(items: T[]) {
  return [...items].toSorted((left_item, right_item) => left_item.id.localeCompare(right_item.id))
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
