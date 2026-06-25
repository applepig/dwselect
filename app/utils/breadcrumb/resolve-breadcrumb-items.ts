import type { CategoryChipView } from '../public-content-view-types.ts'
import type { PublicTaxonomies } from '../public-content-payload.ts'
import { createTaxonomyLabelResolver } from '../content/taxonomy-labels.ts'

// breadcrumb 推導抽成純函式：layout 只負責接 route／shell data，導向規則在此單元測試覆蓋。
// 與 detail 頁一致——layout breadcrumb 充當 h1，taxonomy／detail 頁本身不再放重複標題（AC26）。

export type BreadcrumbItem = {
  label: string
  to?: string | { path: string, query?: Record<string, string> }
}

type BreadcrumbDetailEntry = {
  name?: string
  title?: string
  category_id?: string
  category_label?: string
}

export type BreadcrumbShellData = {
  desktop_category_items: CategoryChipView[]
  product_details_by_id: Record<string, BreadcrumbDetailEntry>
  guide_details_by_id: Record<string, BreadcrumbDetailEntry>
  taxonomies: PublicTaxonomies
}

type RouteQuery = Record<string, string | null | Array<string | null> | undefined>

// 各 taxonomy 前綴對應的 label getter；channel 走 channels.json、brand/tag 走 tags→brands fallback。
const TAXONOMY_PREFIXES = ['/category/', '/tag/', '/brand/', '/channel/'] as const

export function resolveBreadcrumbItems(
  route_path: string,
  route_query: RouteQuery,
  shell_data: BreadcrumbShellData | null,
): BreadcrumbItem[] {
  if (route_path === '/') {
    const label = resolveActiveHomeCategoryLabel(route_query, shell_data)

    return label === null ? [] : [{ label }]
  }

  if (route_path === '/guide') {
    return [{ label: '指南' }]
  }

  if (route_path === '/links') {
    return [{ label: '連結' }]
  }

  if (route_path === '/search') {
    return [{ label: '搜尋' }]
  }

  if (route_path.startsWith('/products/')) {
    return resolveProductBreadcrumb(route_path, shell_data)
  }

  if (route_path.startsWith('/guide/')) {
    return resolveGuideBreadcrumb(route_path, shell_data)
  }

  const taxonomy_prefix = TAXONOMY_PREFIXES.find((prefix) => route_path.startsWith(prefix))

  if (taxonomy_prefix !== undefined) {
    return resolveTaxonomyBreadcrumb(taxonomy_prefix, route_path, shell_data)
  }

  return []
}

function resolveActiveHomeCategoryLabel(route_query: RouteQuery, shell_data: BreadcrumbShellData | null): string | null {
  const category_query = route_query.category

  if (typeof category_query !== 'string' || category_query === '' || category_query === 'all') {
    return null
  }

  const category_item = shell_data?.desktop_category_items.find((item) => item.id === category_query)

  if (category_item === undefined || category_item.id === 'all') {
    return null
  }

  return category_item.label
}

function resolveProductBreadcrumb(route_path: string, shell_data: BreadcrumbShellData | null): BreadcrumbItem[] {
  const product_id = getRouteId(route_path)
  const product_item = product_id === null ? undefined : shell_data?.product_details_by_id[product_id]

  if (product_item === undefined) {
    return [{ label: '商品詳情' }]
  }

  return [
    {
      label: product_item.category_label ?? '',
      to: { path: '/', query: { category: product_item.category_id ?? '' } },
    },
    { label: product_item.name ?? '' },
  ]
}

function resolveGuideBreadcrumb(route_path: string, shell_data: BreadcrumbShellData | null): BreadcrumbItem[] {
  const guide_id = getRouteId(route_path)
  const guide_item = guide_id === null ? undefined : shell_data?.guide_details_by_id[guide_id]

  if (guide_item === undefined) {
    return [{ label: '指南詳情' }]
  }

  return [
    { label: '指南', to: '/guide' },
    { label: guide_item.title ?? '' },
  ]
}

function resolveTaxonomyBreadcrumb(
  prefix: typeof TAXONOMY_PREFIXES[number],
  route_path: string,
  shell_data: BreadcrumbShellData | null,
): BreadcrumbItem[] {
  const taxonomy_id = getRouteId(route_path)

  if (taxonomy_id === null) {
    return []
  }

  if (shell_data === null) {
    return [{ label: taxonomy_id }]
  }

  const labels = createTaxonomyLabelResolver(shell_data.taxonomies)

  return [{ label: resolveTaxonomyLabel(prefix, taxonomy_id, labels) }]
}

function resolveTaxonomyLabel(
  prefix: typeof TAXONOMY_PREFIXES[number],
  taxonomy_id: string,
  labels: ReturnType<typeof createTaxonomyLabelResolver>,
): string {
  if (prefix === '/category/') {
    return labels.getCategoryLabel(taxonomy_id)
  }

  if (prefix === '/channel/') {
    return labels.getChannelLabel(taxonomy_id)
  }

  // tag 與 brand 共用 tag_ids namespace（ADR-8），getTaxonomyTagLabel 已含 tags→brands→raw-id fallback。
  return labels.getTaxonomyTagLabel(taxonomy_id)
}

function getRouteId(route_path: string): string | null {
  const segments = route_path.split('/').filter((segment) => segment !== '')
  const last = segments.at(-1)

  return last ?? null
}
