import type { SearchSuggestion } from '../search/search-index'
import type { CompactResourceRow, ResourceRowLinkAttributes, SearchResultSection } from './types'

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
