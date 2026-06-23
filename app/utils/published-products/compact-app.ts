import type { Product } from '../product-schema'
import type { CategoryChipView } from '../public-content-view-types'
import type { PublicContentPayload } from '../public-content-payload'
import type {
  CompactAppState,
  CompactAppTab,
  CompactAppTabId,
  CompactAppView,
  CompactCategoryChip,
  CompactRouteQueryValue,
  CompactRouteState,
  CompactRouteStateOptions,
} from './types'

const COMPACT_APP_TABS: Array<Omit<CompactAppTab, 'active'>> = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search' },
  { id: 'links', label: '連結', icon: 'i-lucide-link' },
]

export type CompactAppPayload = Pick<PublicContentPayload, 'products' | 'guides' | 'links' | 'navigation'>

export function getCompactAppView(
  payload: CompactAppPayload,
  state: CompactAppState = {},
): CompactAppView {
  const active_tab = normalizeCompactTab(state.active_tab)
  const selected_category_id = state.home_category_id ?? 'all'
  const cards = payload.products.cards
  const home_products = selected_category_id === 'all'
    ? cards
    : cards.filter((card) => card.category_id === selected_category_id)
  const guide_rows = payload.guides.rows

  return {
    tabs: COMPACT_APP_TABS.map((tab) => ({
      ...tab,
      active: tab.id === active_tab,
    })),
    active_tab,
    home: {
      category_chips: getCategoryChips(payload.navigation.category_chips, selected_category_id),
      products: home_products,
      empty_reason: getEmptyReason(cards.length, home_products.length),
    },
    guide: {
      guides: guide_rows,
      empty_reason: getEmptyReason(guide_rows.length, guide_rows.length),
    },
    links: payload.links,
    counts: {
      published: payload.navigation.counts.products,
    },
  }
}

export function getCategoryChips(
  category_chips: CategoryChipView[],
  active_category_id: Product['category_id'] | 'all',
): CompactCategoryChip[] {
  return category_chips.map((chip) => ({
    ...chip,
    active: chip.id === active_category_id,
  }))
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

  if (valid_category_ids === undefined || !valid_category_ids.includes(category_id)) {
    return 'all'
  }

  return category_id
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

function getEmptyReason(published_count: number, filtered_count: number): CompactAppView['home']['empty_reason'] {
  if (published_count === 0) {
    return 'no-products'
  }

  if (filtered_count === 0) {
    return 'no-results'
  }

  return null
}
