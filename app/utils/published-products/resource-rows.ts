import type { SearchSuggestion } from '../search/search-index'
import type { Guide, LinkDefinition } from '../product-schema'
import type { CompactResourceRow, ResourceRowLinkAttributes, SearchResultSection, TaxonomyDefinitions } from './types'
import { DEFAULT_TAXONOMIES, compareText, getCategoryDefinition } from './shared'

export function getPublishedGuides(
  guides: Guide[],
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): CompactResourceRow[] {
  return guides
    .filter((guide) => guide.status === 'published')
    .toSorted(compareGuides)
    .map((guide) => mapGuideToRow(guide, taxonomies))
}

export function getPublishedLinks(links: LinkDefinition[]): CompactResourceRow[] {
  return links
    .filter((link) => link.status === 'published')
    .toSorted((left_link, right_link) => left_link.sort_order - right_link.sort_order)
    .map(mapLinkToRow)
}

export function getResourceRowLinkAttributes(row: CompactResourceRow): ResourceRowLinkAttributes {
  if (!row.external) {
    return {
      to: row.href,
    }
  }

  return {
    href: row.href,
    target: '_blank',
    rel: 'noopener noreferrer',
  }
}

export function getSearchResultSections(results: SearchSuggestion[]): SearchResultSection[] {
  const sections: SearchResultSection[] = [
    { id: 'products', label: '商品', rows: [] },
    { id: 'guides', label: '指南', rows: [] },
    { id: 'links', label: '連結', rows: [] },
  ]
  const sections_by_type = new Map<SearchSuggestion['type'], SearchResultSection>([
    ['product', sections[0]!],
    ['guide', sections[1]!],
    ['link', sections[2]!],
  ])

  for (const result of results) {
    sections_by_type.get(result.type)?.rows.push(mapSearchSuggestionToRow(result))
  }

  return sections.filter((section) => section.rows.length > 0)
}

function mapGuideToRow(guide: Guide, taxonomies: TaxonomyDefinitions): CompactResourceRow {
  const category_labels = guide.category_ids.map((category_id) => getCategoryDefinition(category_id, taxonomies).label)

  return {
    id: guide.id,
    type: 'guide',
    title: guide.title,
    subtitle: guide.summary,
    meta: category_labels.length === 0 ? null : category_labels.join('、'),
    href: guide.source_url,
    image_url: guide.image_url,
    icon: 'i-lucide-book-open',
    external: true,
    target: '_blank',
    rel: 'noopener noreferrer',
  }
}

function mapLinkToRow(link: LinkDefinition): CompactResourceRow {
  return {
    id: link.id,
    type: 'link',
    title: link.title,
    subtitle: link.summary,
    meta: link.url,
    href: link.url,
    image_url: link.image_url ?? null,
    icon: link.icon,
    external: true,
    target: '_blank',
    rel: 'noopener noreferrer',
  }
}

function mapSearchSuggestionToRow(result: SearchSuggestion): CompactResourceRow {
  return {
    id: result.document_id,
    type: result.type,
    title: result.title,
    subtitle: result.summary,
    meta: getSearchSuggestionMeta(result),
    href: result.href,
    image_url: result.image_url,
    icon: getSearchSuggestionIcon(result.type),
    external: result.external,
    target: result.external ? '_blank' : null,
    rel: result.external ? 'noopener noreferrer' : null,
  }
}

function getSearchSuggestionMeta(result: SearchSuggestion): string | null {
  if (result.type === 'product') {
    return [result.channel_label, result.price_text]
      .filter((meta): meta is string => meta !== undefined && meta !== '')
      .join(' · ') || null
  }

  return result.category_labels.length === 0 ? null : result.category_labels.join('、')
}

function getSearchSuggestionIcon(type: SearchSuggestion['type']): string | null {
  if (type === 'guide') {
    return 'i-lucide-book-open'
  }

  if (type === 'link') {
    return 'i-lucide-link'
  }

  return null
}

function compareGuides(left_guide: Guide, right_guide: Guide) {
  const published_at_order = compareNullableTimestampDesc(left_guide.published_at, right_guide.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_guide.title, right_guide.title)
}

function compareNullableTimestampDesc(left_value: string | null, right_value: string | null) {
  if (left_value === right_value) {
    return 0
  }

  if (left_value === null) {
    return 1
  }

  if (right_value === null) {
    return -1
  }

  return right_value.localeCompare(left_value)
}
