import MiniSearch, { type SearchResult } from 'minisearch'

import { compareGuides } from '../content/compare-guides.ts'
import { compareLinks } from '../content/compare-links.ts'
import { compareProducts } from '../content/compare-products.ts'
import { extractContentId } from '../content/extract-content-id.ts'
import { getPrimaryOffer } from '../content/primary-offer.ts'
import { createTaxonomyLabelResolver, type TaxonomyLabelResolver } from '../content/taxonomy-labels.ts'
import { resolveImageFileUrl } from '../content-images/resolve-image-file-url.ts'
import { resolveProductImageUrl } from '../content-images/resolve-product-image-url.ts'
import type { CategoryDefinition, ChannelDefinition, Guide, LinkDefinition, Product, TagDefinition } from '../product-schema.ts'
import type { TaxonomyDefinitions } from '../published-products/types.ts'
import { tokenizeSearchText } from './search-tokenizer.ts'

export const SEARCH_INDEX_VERSION = 1

export type SearchContentInput = {
  products: Product[]
  guides: Guide[]
  links: LinkDefinition[]
}

export type SearchDocument = {
  document_id: string
  content_id: string
  type: 'product' | 'guide' | 'link'
  title: string
  summary: string
  category_ids: string[]
  category_labels: string[]
  tag_ids: string[]
  tag_labels: string[]
  image_url: string | null
  href: string
  external: boolean
  price_text?: string
  channel_id?: string
  channel_label?: string
  published_at: string | null
  description?: string
  llm_description?: string
  search_aliases_text?: string
  model_numbers_text?: string
  taxonomy_aliases_text?: string
  search_text?: string
}

export type SearchIndexDocumentSummary = Pick<
  SearchDocument,
  | 'document_id'
  | 'content_id'
  | 'type'
  | 'title'
  | 'summary'
  | 'category_ids'
  | 'category_labels'
  | 'tag_ids'
  | 'tag_labels'
  | 'image_url'
  | 'href'
  | 'external'
  | 'price_text'
  | 'channel_id'
  | 'channel_label'
  | 'published_at'
>

export type SearchIndexPayload = {
  version: typeof SEARCH_INDEX_VERSION
  generated_at: string
  documents: SearchIndexDocumentSummary[]
  index: ReturnType<MiniSearch<SearchDocument>['toJSON']>
}

export type SearchSuggestion = {
  document_id: string
  content_id: string
  type: SearchDocument['type']
  label: string
  title: string
  summary: string
  category_labels: string[]
  tag_labels: string[]
  image_url: string | null
  href: string
  external: boolean
  price_text?: string
  channel_id?: string
  channel_label?: string
  score: number
}

type BuildSearchIndexOptions = {
  generated_at?: string
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags: TagDefinition[]
  brands: TagDefinition[]
}

const SEARCH_FIELDS: Array<keyof SearchDocument> = [
  'title',
  'summary',
  'description',
  'llm_description',
  'search_aliases_text',
  'model_numbers_text',
  'taxonomy_aliases_text',
  'search_text',
  'category_labels',
  'tag_labels',
  'channel_label',
]
const SEARCH_FIELD_BOOSTS: Partial<Record<keyof SearchDocument, number>> = {
  title: 8,
  tag_labels: 5,
  description: 3,
  llm_description: 2,
  summary: 1.5,
  search_aliases_text: 1,
  model_numbers_text: 1,
  taxonomy_aliases_text: 1,
  search_text: 1,
  category_labels: 1,
  channel_label: 1,
}
const SEARCH_STORE_FIELDS: Array<keyof SearchDocument> = [
  'document_id',
  'content_id',
  'type',
  'title',
  'summary',
  'category_labels',
  'tag_labels',
  'image_url',
  'href',
  'external',
  'price_text',
  'channel_id',
  'channel_label',
]

export function getSearchDocuments(
  input: Product[] | SearchContentInput,
  options: Pick<BuildSearchIndexOptions, 'categories' | 'channels' | 'tags' | 'brands'>,
): SearchDocument[] {
  const content = normalizeSearchContentInput(input)
  const taxonomies: TaxonomyDefinitions = {
    categories: options.categories,
    channels: options.channels,
    tags: options.tags,
    brands: options.brands,
  }
  const labels = createTaxonomyLabelResolver(taxonomies)
  const tag_aliases = getTagAliasMap(options.tags)
  const product_tag_aliases = getTagAliasMap([...options.tags, ...options.brands])

  return [
    ...content.products
      .filter((product) => product.status === 'published')
      .toSorted((left_product, right_product) => compareProducts(left_product, right_product, taxonomies))
      .map((product) => mapProductToSearchDocument(product, labels, product_tag_aliases)),
    ...content.guides
      .filter((guide) => guide.status === 'published')
      .toSorted(compareGuides)
      .map((guide) => mapGuideToSearchDocument(guide, labels, tag_aliases)),
    ...content.links
      .filter((link) => link.status === 'published')
      .toSorted(compareLinks)
      .map((link) => mapLinkToSearchDocument(link, labels, tag_aliases)),
  ]
}

export function buildSearchIndexPayload(
  input: Product[] | SearchContentInput,
  options: BuildSearchIndexOptions,
): SearchIndexPayload {
  const documents = getSearchDocuments(input, options)
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

  const results = mini_search.search(normalized_query, { prefix: true, fuzzy: 0.2, boost: SEARCH_FIELD_BOOSTS })

  if (limit === undefined) {
    return results.map(mapSearchResultToSuggestion)
  }

  return results
    .slice(0, limit)
    .map(mapSearchResultToSuggestion)
}

export function getSearchOptions() {
  return {
    idField: 'document_id',
    fields: SEARCH_FIELDS,
    storeFields: SEARCH_STORE_FIELDS,
    tokenize: (value: string) => tokenizeSearchText(value),
  }
}

function createSearchIndex() {
  return new MiniSearch<SearchDocument>(getSearchOptions())
}

type SearchOnlyFieldName = 'description' | 'llm_description' | 'search_aliases_text' | 'model_numbers_text' | 'taxonomy_aliases_text' | 'search_text'
type SearchDocumentBase = Omit<SearchDocument, SearchOnlyFieldName>

// Search-only fields 必須維持 non-enumerable：供 MiniSearch 索引，但不被序列化進 document summary。
function attachSearchFields(
  document: SearchDocumentBase,
  fields: Record<SearchOnlyFieldName, string>,
): SearchDocument {
  for (const [field_name, field_value] of Object.entries(fields)) {
    Object.defineProperty(document, field_name, {
      value: field_value,
      enumerable: false,
    })
  }

  return document as SearchDocument
}

function mapProductToSearchDocument(
  product: Product,
  labels: TaxonomyLabelResolver,
  tag_aliases: ReadonlyMap<string, string[]>,
): SearchDocument {
  const content_id = extractContentId(product.id)
  const primary_offer = getPrimaryOffer(product)
  const document: SearchDocumentBase = {
    document_id: `product:${content_id}`,
    content_id,
    type: 'product',
    title: product.name,
    summary: product.summary,
    category_ids: [product.category_id],
    category_labels: [labels.getCategoryLabel(product.category_id)],
    tag_ids: [...product.tag_ids],
    tag_labels: product.tag_ids.map((tag_id) => labels.getProductTagLabel(tag_id)),
    image_url: resolveProductImageUrl(product),
    href: `/products/${content_id}`,
    external: false,
    price_text: primary_offer.price_text,
    channel_id: primary_offer.channel_id,
    channel_label: labels.getChannelLabel(primary_offer.channel_id),
    published_at: product.published_at,
  }

  return attachSearchFields(document, {
    description: product.long_description,
    llm_description: product.llm_description,
    search_aliases_text: product.search_aliases.join(' '),
    model_numbers_text: product.model_numbers.join(' '),
    taxonomy_aliases_text: getTagAliases(product.tag_ids, tag_aliases).join(' '),
    search_text: product.english_name,
  })
}

function mapGuideToSearchDocument(
  guide: Guide,
  labels: TaxonomyLabelResolver,
  tag_aliases: ReadonlyMap<string, string[]>,
): SearchDocument {
  const document: SearchDocumentBase = {
    document_id: `guide:${guide.id}`,
    content_id: guide.id,
    type: 'guide',
    title: guide.title,
    summary: guide.summary,
    category_ids: [...guide.category_ids],
    category_labels: guide.category_ids.map((category_id) => labels.getCategoryLabel(category_id)),
    tag_ids: [...guide.tag_ids],
    tag_labels: guide.tag_ids.map((tag_id) => labels.getContentTagLabel(tag_id)),
    image_url: resolveGuideSearchImageUrl(guide),
    href: guide.source_url,
    external: true,
    published_at: guide.published_at,
  }

  return attachSearchFields(document, {
    description: '',
    llm_description: '',
    search_aliases_text: '',
    model_numbers_text: '',
    taxonomy_aliases_text: getTagAliases(guide.tag_ids, tag_aliases).join(' '),
    search_text: '',
  })
}

function mapLinkToSearchDocument(
  link: LinkDefinition,
  labels: TaxonomyLabelResolver,
  tag_aliases: ReadonlyMap<string, string[]>,
): SearchDocument {
  const document: SearchDocumentBase = {
    document_id: `link:${link.id}`,
    content_id: link.id,
    type: 'link',
    title: link.title,
    summary: link.summary,
    category_ids: [...link.category_ids],
    category_labels: link.category_ids.map((category_id) => labels.getCategoryLabel(category_id)),
    tag_ids: [...link.tag_ids],
    tag_labels: link.tag_ids.map((tag_id) => labels.getContentTagLabel(tag_id)),
    image_url: link.image_url ?? null,
    href: link.url,
    external: true,
    published_at: link.published_at,
  }

  return attachSearchFields(document, {
    description: '',
    llm_description: '',
    search_aliases_text: '',
    model_numbers_text: '',
    taxonomy_aliases_text: getTagAliases(link.tag_ids, tag_aliases).join(' '),
    search_text: '',
  })
}

function mapDocumentToSummary(document: SearchDocument): SearchIndexDocumentSummary {
  return {
    document_id: document.document_id,
    content_id: document.content_id,
    type: document.type,
    title: document.title,
    summary: document.summary,
    category_ids: document.category_ids,
    category_labels: document.category_labels,
    tag_ids: document.tag_ids,
    tag_labels: document.tag_labels,
    image_url: document.image_url,
    href: document.href,
    external: document.external,
    price_text: document.price_text,
    channel_id: document.channel_id,
    channel_label: document.channel_label,
    published_at: document.published_at,
  }
}

function mapSearchResultToSuggestion(result: SearchResult): SearchSuggestion {
  return {
    document_id: String(result.document_id ?? result.id),
    content_id: String(result.content_id),
    type: result.type as SearchDocument['type'],
    label: String(result.title),
    title: String(result.title),
    summary: String(result.summary),
    category_labels: toStringArray(result.category_labels),
    tag_labels: toStringArray(result.tag_labels),
    image_url: result.image_url === null ? null : String(result.image_url),
    href: String(result.href),
    external: Boolean(result.external),
    price_text: result.price_text === undefined ? undefined : String(result.price_text),
    channel_id: result.channel_id === undefined ? undefined : String(result.channel_id),
    channel_label: result.channel_label === undefined ? undefined : String(result.channel_label),
    score: result.score,
  }
}

function normalizeSearchContentInput(input: Product[] | SearchContentInput): SearchContentInput {
  if (Array.isArray(input)) {
    return { products: input, guides: [], links: [] }
  }

  return input
}

function resolveGuideSearchImageUrl(guide: Pick<Guide, 'image_file' | 'image_url'>): string | null {
  return resolveImageFileUrl(guide.image_file, 'guides')
}

function getTagAliases(tag_ids: string[], tag_aliases: ReadonlyMap<string, string[]>) {
  return tag_ids.flatMap((tag_id) => tag_aliases.get(tag_id) ?? [])
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String)
  }

  if (value === undefined || value === null) {
    return []
  }

  return [String(value)]
}

function getTagAliasMap(tags: TagDefinition[]) {
  return new Map(tags.map((tag) => [tag.id, tag.aliases]))
}
