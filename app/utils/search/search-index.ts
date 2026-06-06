import MiniSearch, { type SearchResult } from 'minisearch'

import type { Product } from '../product-schema.ts'
import { tokenizeSearchText } from './search-tokenizer.ts'

export const SEARCH_INDEX_VERSION = 1

export type SearchDocument = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  price_text: string
  purchase_url: string
  image_url: string
  published_at: string | null
}

export type SearchIndexDocumentSummary = Pick<
  SearchDocument,
  'id' | 'name' | 'category' | 'price_text' | 'image_url'
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
  price_text: string
  score: number
}

type BuildSearchIndexOptions = {
  generated_at?: string
}

const SEARCH_FIELDS: Array<keyof SearchDocument> = ['name', 'description', 'category', 'tags']
const SEARCH_STORE_FIELDS: Array<keyof SearchDocument> = ['id', 'name', 'category', 'price_text', 'image_url']

export function getSearchDocuments(products: Product[]): SearchDocument[] {
  return products
    .filter((product) => product.status === 'published')
    .toSorted(compareProducts)
    .map(mapProductToSearchDocument)
}

export function buildSearchIndexPayload(
  products: Product[],
  options: BuildSearchIndexOptions = {},
): SearchIndexPayload {
  const documents = getSearchDocuments(products)
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

function mapProductToSearchDocument(product: Product): SearchDocument {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    tags: [...product.tags],
    price_text: product.price_text,
    purchase_url: product.purchase_url,
    image_url: product.image_url,
    published_at: product.published_at,
  }
}

function mapDocumentToSummary(document: SearchDocument): SearchIndexDocumentSummary {
  return {
    id: document.id,
    name: document.name,
    category: document.category,
    price_text: document.price_text,
    image_url: document.image_url,
  }
}

function mapSearchResultToSuggestion(result: SearchResult): SearchSuggestion {
  return {
    id: result.id,
    label: String(result.name),
    category: String(result.category),
    price_text: String(result.price_text),
    score: result.score,
  }
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
