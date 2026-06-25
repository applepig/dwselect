import type { CategoryDefinition, ChannelDefinition, Product, TagDefinition } from '../product-schema'
import type { ProductCardView } from '../public-content-view-types'
import type { TaxonomyKind } from './select-taxonomy-items'

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
  id: string
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
  // taxonomy ids 供 taxonomy 頁以 category／tag 精準篩選 guide／link rows。
  // optional：search 結果 row 由 SearchSuggestion 產生、不帶 taxonomy ids，故不強制；
  // build payload 的 guide／link rows 一律帶滿，taxonomy 頁據此篩選。
  category_ids?: string[]
  tag_ids?: string[]
}

export type CompactLinkRow = CompactResourceRow
export type CompactGuideRow = CompactResourceRow

// taxonomy 瀏覽頁（/category/{id}、/tag/{id}、/brand/{id}、/channel/{id}）的渲染資料。
// products 用 ProductCard grid，guides／links 用 ResourceList；空陣列代表該型別區段不渲染。
export type TaxonomyPageData = {
  taxonomy_kind: TaxonomyKind
  id: string
  label: string
  description: string | null
  products: ProductCardView[]
  guides: CompactResourceRow[]
  links: CompactResourceRow[]
}

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
