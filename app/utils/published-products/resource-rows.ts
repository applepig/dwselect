import type { SearchSuggestion } from '../search/search-index'
import { EXTERNAL_LINK_ATTRS, RESOURCE_ROW_ICONS } from './resource-row-attrs'
import type { CompactResourceRow, ResourceRowLinkAttributes, SearchResultSection } from './types'

export function getResourceRowLinkAttributes(row: CompactResourceRow): ResourceRowLinkAttributes {
  if (!row.external) {
    return {
      to: row.href,
    }
  }

  return {
    href: row.href,
    ...EXTERNAL_LINK_ATTRS,
  }
}

export function getSearchResultSections(results: SearchSuggestion[]): SearchResultSection[] {
  const sections: SearchResultSection[] = [
    { id: 'products', label: '產品', rows: [] },
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
    // 外部安全屬性走 EXTERNAL_LINK_ATTRS 單一真相；非外部 row 無 target/rel。
    ...(result.external ? EXTERNAL_LINK_ATTRS : { target: null, rel: null }),
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
  if (type === 'product') {
    return null
  }

  return RESOURCE_ROW_ICONS[type]
}
