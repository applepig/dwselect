import MiniSearch, { type SearchResult } from 'minisearch'

import type { CategoryDefinition, ChannelDefinition, Product } from '../product-schema.ts'
import { tokenizeSearchText } from './search-tokenizer.ts'

export const SEARCH_INDEX_VERSION = 1

export type SearchDocument = {
  id: string
  name: string
  summary: string
  description: string
  category_id: string
  category_label: string
  channel_id: string
  channel_label: string
  tags: string[]
  price_text: string
  image_url: string
  published_at: string | null
}

export type SearchIndexDocumentSummary = Pick<
  SearchDocument,
  'id' | 'name' | 'category_label' | 'channel_label' | 'price_text' | 'image_url'
>

export type SearchIndexPayload = {
  version: typeof SEARCH_INDEX_VERSION
  generated_at: string
  documents: SearchIndexDocumentSummary[]
  index: ReturnType<MiniSearch<SearchDocument>['toJSON']>
}

export type SearchSuggestion = {
  id: string
  label: string
  category: string
  category_label: string
  channel: string
  channel_label: string
  price_text: string
  score: number
}

type BuildSearchIndexOptions = {
  generated_at?: string
  categories?: CategoryDefinition[]
  channels?: ChannelDefinition[]
}

const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'home', label: '居家', short_label: '居家', sort_order: 10 },
  { id: 'kitchen', label: '廚房', short_label: '廚房', sort_order: 20 },
  { id: 'computer', label: '電腦', short_label: '電腦', sort_order: 30 },
  { id: 'three-c', label: '3C', short_label: '3C', sort_order: 40 },
  { id: 'av', label: '影音', short_label: '影音', sort_order: 50 },
  { id: 'food', label: '食材', short_label: '食材', sort_order: 60 },
  { id: 'other', label: '其他', short_label: '其他', sort_order: 999 },
]

const DEFAULT_CHANNELS: ChannelDefinition[] = [
  { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
  { id: 'momo', label: 'momo', tint: 'pink', host_patterns: ['www.momoshop.com.tw'], sort_order: 20 },
  {
    id: 'amazonjp',
    label: 'Amazon JP',
    tint: 'amber',
    host_patterns: ['www.amazon.co.jp', 'amzn.asia'],
    sort_order: 30,
  },
  { id: 'amazonus', label: 'Amazon US', tint: 'amber', host_patterns: ['www.amazon.com'], sort_order: 40 },
  { id: 'costco', label: 'Costco', tint: 'indigo', host_patterns: ['www.costco.com.tw'], sort_order: 50 },
  { id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 999 },
]

const SEARCH_FIELDS: Array<keyof SearchDocument> = [
  'name',
  'summary',
  'description',
  'category_label',
  'channel_label',
  'tags',
]
const SEARCH_STORE_FIELDS: Array<keyof SearchDocument> = [
  'id',
  'name',
  'category_label',
  'channel_label',
  'price_text',
  'image_url',
]

export function getSearchDocuments(
  products: Product[],
  options: Pick<BuildSearchIndexOptions, 'categories' | 'channels'> = {},
): SearchDocument[] {
  const category_labels = getCategoryLabelMap(options.categories ?? DEFAULT_CATEGORIES)
  const channel_labels = getChannelLabelMap(options.channels ?? DEFAULT_CHANNELS)

  return products
    .filter((product) => product.status === 'published')
    .toSorted(compareProducts)
    .map((product) => mapProductToSearchDocument(product, category_labels, channel_labels))
}

export function buildSearchIndexPayload(
  products: Product[],
  options: BuildSearchIndexOptions = {},
): SearchIndexPayload {
  const documents = getSearchDocuments(products, options)
  const mini_search = createSearchIndex()

  mini_search.addAll(documents)

  return {
    version: SEARCH_INDEX_VERSION,
    generated_at: options.generated_at ?? new Date().toISOString(),
    documents: documents.map(mapDocumentToSummary),
    index: mini_search.toJSON(),
  }
}

export function loadSearchIndex(payload: SearchIndexPayload): MiniSearch<SearchDocument> {
  if (payload.version !== SEARCH_INDEX_VERSION) {
    throw new Error(`Unsupported search index version: ${payload.version}`)
  }

  return MiniSearch.loadJSON(JSON.stringify(payload.index), getSearchOptions())
}

export function querySearchIndex(
  mini_search: MiniSearch<SearchDocument>,
  query: string,
  limit?: number,
): SearchSuggestion[] {
  const normalized_query = query.trim()

  if (normalized_query === '') {
    return []
  }

  const results = mini_search.search(normalized_query, { prefix: true, fuzzy: 0.2 })

  if (limit === undefined) {
    return results.map(mapSearchResultToSuggestion)
  }

  return results
    .slice(0, limit)
    .map(mapSearchResultToSuggestion)
}

export function getSearchOptions() {
  return {
    fields: SEARCH_FIELDS,
    storeFields: SEARCH_STORE_FIELDS,
    tokenize: (value: string) => tokenizeSearchText(value),
  }
}

function createSearchIndex() {
  return new MiniSearch<SearchDocument>(getSearchOptions())
}

function mapProductToSearchDocument(
  product: Product,
  category_labels: ReadonlyMap<Product['category_id'], string>,
  channel_labels: ReadonlyMap<Product['channel_id'], string>,
): SearchDocument {
  return {
    id: product.id,
    name: product.name,
    summary: product.summary,
    description: product.description,
    category_id: product.category_id,
    category_label: category_labels.get(product.category_id) ?? product.category_id,
    channel_id: product.channel_id,
    channel_label: channel_labels.get(product.channel_id) ?? product.channel_id,
    tags: [...product.tags],
    price_text: product.price_text,
    image_url: product.image_url,
    published_at: product.published_at,
  }
}

function mapDocumentToSummary(document: SearchDocument): SearchIndexDocumentSummary {
  return {
    id: document.id,
    name: document.name,
    category_label: document.category_label,
    channel_label: document.channel_label,
    price_text: document.price_text,
    image_url: document.image_url,
  }
}

function mapSearchResultToSuggestion(result: SearchResult): SearchSuggestion {
  return {
    id: result.id,
    label: String(result.name),
    category: String(result.category_label),
    category_label: String(result.category_label),
    channel: String(result.channel_label),
    channel_label: String(result.channel_label),
    price_text: String(result.price_text),
    score: result.score,
  }
}

function getCategoryLabelMap(categories: CategoryDefinition[]) {
  return new Map(categories.map((category) => [category.id, category.label]))
}

function getChannelLabelMap(channels: ChannelDefinition[]) {
  return new Map(channels.map((channel) => [channel.id, channel.label]))
}

function compareProducts(left_product: Product, right_product: Product) {
  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return left_product.name.localeCompare(right_product.name)
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
