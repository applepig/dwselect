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
  const cards = payload.products.cards
  const guide_rows = payload.guides.rows

  return {
    tabs: COMPACT_APP_TABS.map((tab) => ({
      ...tab,
      active: tab.id === active_tab,
    })),
    active_tab,
    home: {
      category_chips: getCategoryChips(payload.navigation.category_chips, 'all'),
      products: cards,
      empty_reason: getEmptyReason(cards.length, cards.length),
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
  active_category_id: CompactCategoryChip['id'],
): CompactCategoryChip[] {
  return category_chips.map((chip) => ({
    ...chip,
    active: chip.id === active_category_id,
  }))
}

export function getCompactAppStateFromRoute(
  route: CompactRouteState,
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
  }
}

function normalizeCompactTab(tab: CompactAppState['active_tab']): CompactAppTabId {
  if (tab === 'guide' || tab === 'search' || tab === 'links') {
    return tab
  }

  return 'home'
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
