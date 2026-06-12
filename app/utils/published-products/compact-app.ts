import type { Guide, LinkDefinition, Product } from '../product-schema'
import type {
  CompactAppState,
  CompactAppTab,
  CompactAppTabId,
  CompactAppView,
  CompactCategoryChip,
  CompactRouteQueryValue,
  CompactRouteState,
  CompactRouteStateOptions,
  PublishedProductCard,
  TaxonomyDefinitions,
} from './types'
import { DEFAULT_TAXONOMIES, getCategorySortOrder, getPublishedProducts } from './shared'
import { getPublishedGuides, getPublishedLinks } from './resource-rows'
import { getTagChips } from './tags'

const PRODUCT_CATEGORY_IDS = new Set<Product['category_id']>(DEFAULT_TAXONOMIES.categories.map((category) => category.id))

const COMPACT_APP_TABS: Array<Omit<CompactAppTab, 'active'>> = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search' },
  { id: 'links', label: '連結', icon: 'i-lucide-link' },
]

export const DEFAULT_LINKS: LinkDefinition[] = [
  {
    id: '2026-06-02-altwork-station',
    status: 'published',
    title: 'Altwork Station',
    summary: '相信每個人都有「躺著用電腦」的夢想，這個看起來很棒，對吧？  （對不起我不知道怎麼買、也不知道買回來要放哪裡',
    url: 'https://altwork.com/',
    icon: 'i-lucide-link',
    category_ids: ['computer'],
    tag_ids: ['ergonomic'],
    sort_order: 30,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  },
  {
    id: '2026-06-02-b18',
    status: 'published',
    title: 'B18',
    summary: '光華萬事屋，店面現在擺非常多鍵盤，店內沒有擺的東西也可以問',
    url: 'https://www.facebook.com/B18TW',
    icon: 'i-lucide-link',
    category_ids: ['computer'],
    tag_ids: [],
    sort_order: 20,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  },
  {
    id: 'applepig-home',
    status: 'published',
    title: 'applepig.idv.tw',
    summary: 'DW 的主站',
    url: 'https://applepig.idv.tw',
    icon: 'i-lucide-link',
    category_ids: ['other'],
    tag_ids: [],
    sort_order: 10,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  },
]

export function getCompactAppView(
  products: Product[],
  state: CompactAppState = {},
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
  links: LinkDefinition[] = DEFAULT_LINKS,
  guides: Guide[] = [],
): CompactAppView {
  const active_tab = normalizeCompactTab(state.active_tab)
  const selected_category_id = state.home_category_id ?? 'all'
  const search_query = normalizeQuery(state.search_query)
  const published_products = products.filter((product) => product.status === 'published')
  const published_cards = getPublishedProducts(products, taxonomies)
  const selected_tags = getNormalizedSelectedTags(state.selected_tags)
  const top_tags = getTagChips({ products, guides, links }, selected_tags, taxonomies, 10)
  const home_products = selected_category_id === 'all'
    ? published_cards
    : published_cards.filter((product) => product.category_id === selected_category_id)
  const guide_rows = getPublishedGuides(guides, taxonomies)
  const search_products = getSearchProducts(published_cards, search_query, state.search_result_ids)

  return {
    tabs: COMPACT_APP_TABS.map((tab) => ({
      ...tab,
      active: tab.id === active_tab,
    })),
    active_tab,
    top_tags,
    home: {
      category_chips: getCompactCategoryOptions(published_products, selected_category_id, taxonomies),
      products: home_products,
      empty_reason: getEmptyReason(published_cards.length, home_products.length),
    },
    guide: {
      guides: guide_rows,
      empty_reason: getEmptyReason(guide_rows.length, guide_rows.length),
    },
    search: {
      query: search_query,
      products: search_products,
      empty_reason: getSearchEmptyReason(search_query, search_products.length),
    },
    links: getPublishedLinks(links),
    counts: {
      published: published_cards.length,
    },
  }
}

export function getCompactCategoryOptions(
  products: Product[],
  active_category_id: Product['category_id'] | 'all',
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): CompactCategoryChip[] {
  const published_products = products.filter((product) => product.status === 'published')
  const category_counts = new Map<Product['category_id'], number>()

  for (const product of published_products.toSorted((left_product, right_product) => {
    return getCategorySortOrder(left_product.category_id, taxonomies) - getCategorySortOrder(right_product.category_id, taxonomies)
  })) {
    category_counts.set(product.category_id, (category_counts.get(product.category_id) ?? 0) + 1)
  }

  return [
    {
      id: 'all',
      label: '全部',
      count: published_products.length,
      active: active_category_id === 'all',
    },
    ...getVisibleCategories(taxonomies)
      .map((category) => ({
        id: category.id,
        label: category.short_label,
        count: category_counts.get(category.id) ?? 0,
        active: category.id === active_category_id,
      }))
      .filter((category) => category.count > 0),
  ]
}

export function getCompactAppStateFromRoute(
  route: CompactRouteState,
  options: CompactRouteStateOptions = {},
): CompactAppState {
  if (route.path === '/guide') {
    return {
      active_tab: 'guide',
    }
  }

  if (route.path === '/search') {
    return {
      active_tab: 'search',
      search_query: getFirstQueryValue(route.query?.q).trim(),
    }
  }

  if (route.path === '/links') {
    return {
      active_tab: 'links',
    }
  }

  return {
    active_tab: 'home',
    home_category_id: parseCategoryId(route.query?.category, options.category_ids),
  }
}

function normalizeCompactTab(tab: CompactAppState['active_tab']): CompactAppTabId {
  if (tab === 'guide' || tab === 'search' || tab === 'links') {
    return tab
  }

  return 'home'
}

function parseCategoryId(
  value: CompactRouteQueryValue,
  valid_category_ids: CompactRouteStateOptions['category_ids'],
): Product['category_id'] | 'all' {
  const category_id = getFirstQueryValue(value).trim()

  if (category_id === '' || category_id === 'all') {
    return 'all'
  }

  if (valid_category_ids !== undefined && !valid_category_ids.includes(category_id)) {
    return 'all'
  }

  if (!isProductCategoryId(category_id)) {
    return 'all'
  }

  return category_id
}

function isProductCategoryId(value: string): value is Product['category_id'] {
  return PRODUCT_CATEGORY_IDS.has(value as Product['category_id'])
}

function getFirstQueryValue(value: CompactRouteQueryValue) {
  return getQueryValues(value)[0] ?? ''
}

function getQueryValues(value: CompactRouteQueryValue) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string') {
    return [value]
  }

  return []
}

function getNormalizedSelectedTags(tags: CompactAppState['selected_tags']) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter((tag) => tag !== '')))
}

function getVisibleCategories(taxonomies: TaxonomyDefinitions) {
  return taxonomies.categories
    .filter((category) => category.nav_visible)
    .toSorted((left_category, right_category) => left_category.sort_order - right_category.sort_order)
}

function getEmptyReason(published_count: number, filtered_count: number): CompactAppView['home']['empty_reason'] {
  if (published_count === 0) {
    return 'no-products'
  }

  if (filtered_count === 0) {
    return 'no-results'
  }

  return null
}

function getSearchProducts(
  products: PublishedProductCard[],
  query: string,
  search_result_ids: CompactAppState['search_result_ids'],
) {
  if (query === '') {
    return []
  }

  if (Array.isArray(search_result_ids)) {
    const products_by_id = new Map(products.map((product) => [product.id, product]))

    return search_result_ids
      .map((product_id) => products_by_id.get(product_id))
      .filter((product): product is PublishedProductCard => product !== undefined)
  }

  const normalized_query = query.toLocaleLowerCase()

  return products.filter((product) => {
    const searchable_text = [
      product.name,
      product.summary,
      product.description,
      product.category,
      product.channel,
      product.price,
      ...product.tags,
    ].join(' ').toLocaleLowerCase()

    return searchable_text.includes(normalized_query)
  })
}

function getSearchEmptyReason(query: string, filtered_count: number): CompactAppView['search']['empty_reason'] {
  if (query === '') {
    return 'empty-query'
  }

  if (filtered_count === 0) {
    return 'no-results'
  }

  return null
}

function normalizeQuery(query: string | undefined) {
  return query?.trim() ?? ''
}
