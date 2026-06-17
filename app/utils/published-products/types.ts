import type { CategoryDefinition, ChannelDefinition, Product, TagDefinition } from '../product-schema'
import type { ProductCardView } from '../public-content-view-types'

export type TaxonomyDefinitions = {
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags: TagDefinition[]
  brands: TagDefinition[]
}

export type CompactAppTabId = 'home' | 'guide' | 'search' | 'links'

export type CompactAppState = {
  active_tab?: CompactAppTabId
  home_category_id?: Product['category_id'] | 'all'
  search_query?: string
}

export type CompactRouteQueryValue = string | Array<string | null> | null | undefined

export type CompactRouteState = {
  path: string
  query?: Record<string, CompactRouteQueryValue>
}

export type CompactRouteStateOptions = {
  category_ids?: string[]
  tag_labels?: string[]
}

export type CompactAppTab = {
  id: CompactAppTabId
  label: string
  icon: string
  active: boolean
}

export type CompactCategoryChip = {
  id: Product['category_id'] | 'all'
  label: string
  count: number
  active: boolean
}

export type CompactTagChip = {
  label: string
  count: number
  active: boolean
}

export type CompactSearchTagGroups = {
  tags: CompactTagChip[]
  brands: CompactTagChip[]
}

export type CompactResourceRow = {
  id: string
  type: 'product' | 'guide' | 'link'
  title: string
  subtitle: string
  meta: string | null
  href: string
  image_url: string | null
  icon: string | null
  external: boolean
  target: '_blank' | null
  rel: 'noopener noreferrer' | null
}

export type CompactLinkRow = CompactResourceRow
export type CompactGuideRow = CompactResourceRow

export type SearchResultSection = {
  id: 'products' | 'guides' | 'links'
  label: '產品' | '指南' | '連結'
  rows: CompactResourceRow[]
}

export type ResourceRowLinkAttributes
  = | {
    href: string
    target: '_blank'
    rel: 'noopener noreferrer'
  }
  | {
    to: string
  }

export type CompactAppView = {
  tabs: CompactAppTab[]
  active_tab: CompactAppTabId
  home: {
    category_chips: CompactCategoryChip[]
    products: ProductCardView[]
    empty_reason: 'no-products' | 'no-results' | null
  }
  guide: {
    guides: CompactResourceRow[]
    empty_reason: 'no-products' | 'no-results' | null
  }
  links: CompactResourceRow[]
  counts: {
    published: number
  }
}
