import { ALL_CATEGORIES_ID, type CategoryChipView } from '../public-content-view-types'
import type { PublicContentPayload } from '../public-content-payload'
import type {
  CompactAppState,
  CompactAppTab,
  CompactAppView,
  CompactCategoryChip,
  CompactRouteQueryValue,
  CompactRouteState,
} from './types'

// 導覽 tab 單一真相：桌面 nav_items 由此衍生（ADR-3）。
// 順序 home/guide/links/search 以桌面導覽為基準。to 直接存字面（url segment 即 tab 語意）。
export const NAV_TABS: Array<CompactAppTab & { to: string }> = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house', to: '/' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags', to: '/guide' },
  { id: 'links', label: '連結', icon: 'i-lucide-link', to: '/links' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search', to: '/search' },
]

export type CompactAppPayload = Pick<PublicContentPayload, 'products' | 'guides' | 'links' | 'navigation'>

export function getCompactAppView(
  payload: CompactAppPayload,
): CompactAppView {
  const cards = payload.products.cards
  const guide_rows = payload.guides.rows

  return {
    home: {
      category_chips: getCategoryChips(payload.navigation.category_chips, ALL_CATEGORIES_ID),
      products: cards,
      empty_reason: getEmptyReason(cards.length),
    },
    guide: {
      guides: guide_rows,
      empty_reason: getEmptyReason(guide_rows.length),
    },
    links: payload.links,
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
  if (route.path === '/search' || route.path === '/search/') {
    return {
      search_query: getFirstQueryValue(route.query?.q).trim(),
    }
  }

  return {}
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

function getEmptyReason(published_count: number): CompactAppView['home']['empty_reason'] {
  if (published_count === 0) {
    return 'no-products'
  }

  return null
}
