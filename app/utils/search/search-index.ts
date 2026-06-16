import MiniSearch, { type SearchResult } from 'minisearch'

import { resolveImageFileUrl } from '../content-images/resolve-image-file-url.ts'
import type { CategoryDefinition, ChannelDefinition, Guide, LinkDefinition, Product, TagDefinition } from '../product-schema.ts'
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
  'search_text',
  'category_labels',
  'tag_labels',
  'channel_label',
]
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
  const category_labels = getCategoryLabelMap(options.categories)
  const channel_labels = getChannelLabelMap(options.channels)
  const tag_labels = getTagLabelMap(options.tags)
  const product_tag_labels = getTagLabelMap([...options.tags, ...options.brands])
  const tag_aliases = getTagAliasMap(options.tags)
  const product_tag_aliases = getTagAliasMap([...options.tags, ...options.brands])

  return [
    ...content.products
      .filter((product) => product.status === 'published')
      .toSorted(compareProducts)
      .map((product) => mapProductToSearchDocument(product, category_labels, channel_labels, product_tag_labels, product_tag_aliases)),
    ...content.guides
      .filter((guide) => guide.status === 'published')
      .toSorted(compareGuides)
      .map((guide) => mapGuideToSearchDocument(guide, category_labels, tag_labels, tag_aliases)),
    ...content.links
      .filter((link) => link.status === 'published')
      .toSorted((left_link, right_link) => left_link.sort_order - right_link.sort_order)
      .map((link) => mapLinkToSearchDocument(link, category_labels, tag_labels, tag_aliases)),
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
    idField: 'document_id',
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
  channel_labels: ReadonlyMap<string, string>,
  tag_labels: ReadonlyMap<string, string>,
  tag_aliases: ReadonlyMap<string, string[]>,
): SearchDocument {
  const content_id = getContentId(product.id)
  const primary_offer = product.offers[0]!
  const document = {
    document_id: `product:${content_id}`,
    content_id,
    type: 'product' as const,
    title: product.name,
    summary: product.summary,
    category_ids: [product.category_id],
    category_labels: [category_labels.get(product.category_id) ?? product.category_id],
    tag_ids: [...product.tag_ids],
    tag_labels: getTagLabels(product.tag_ids, tag_labels),
    image_url: resolveProductSearchImageUrl(product),
    href: `/products/${content_id}`,
    external: false,
    price_text: primary_offer.price_text,
    channel_id: primary_offer.channel_id,
    channel_label: channel_labels.get(primary_offer.channel_id) ?? primary_offer.channel_id,
    published_at: product.published_at,
  }

  Object.defineProperty(document, 'description', {
    value: product.long_description,
    enumerable: false,
  })
  Object.defineProperty(document, 'search_text', {
    value: [
      product.english_name,
      product.llm_description,
      ...product.search_aliases,
      ...product.model_numbers,
      ...getTagAliases(product.tag_ids, tag_aliases),
    ].join(' '),
    enumerable: false,
  })

  return document
}

function mapGuideToSearchDocument(
  guide: Guide,
  category_labels: ReadonlyMap<string, string>,
  tag_labels: ReadonlyMap<string, string>,
  tag_aliases: ReadonlyMap<string, string[]>,
): SearchDocument {
  const document = {
    document_id: `guide:${guide.id}`,
    content_id: guide.id,
    type: 'guide' as const,
    title: guide.title,
    summary: guide.summary,
    category_ids: [...guide.category_ids],
    category_labels: guide.category_ids.map((category_id) => category_labels.get(category_id) ?? category_id),
    tag_ids: [...guide.tag_ids],
    tag_labels: getTagLabels(guide.tag_ids, tag_labels),
    image_url: resolveGuideSearchImageUrl(guide),
    href: guide.source_url,
    external: true,
    published_at: guide.published_at,
  }

  Object.defineProperty(document, 'description', {
    value: guide.summary,
    enumerable: false,
  })
  Object.defineProperty(document, 'search_text', {
    value: getTagAliases(guide.tag_ids, tag_aliases).join(' '),
    enumerable: false,
  })

  return document
}

function mapLinkToSearchDocument(
  link: LinkDefinition,
  category_labels: ReadonlyMap<string, string>,
  tag_labels: ReadonlyMap<string, string>,
  tag_aliases: ReadonlyMap<string, string[]>,
): SearchDocument {
  const document = {
    document_id: `link:${link.id}`,
    content_id: link.id,
    type: 'link' as const,
    title: link.title,
    summary: link.summary,
    category_ids: [...link.category_ids],
    category_labels: link.category_ids.map((category_id) => category_labels.get(category_id) ?? category_id),
    tag_ids: [...link.tag_ids],
    tag_labels: getTagLabels(link.tag_ids, tag_labels),
    image_url: link.image_url ?? null,
    href: link.url,
    external: true,
    published_at: link.published_at,
  }

  Object.defineProperty(document, 'description', {
    value: link.summary,
    enumerable: false,
  })
  Object.defineProperty(document, 'search_text', {
    value: getTagAliases(link.tag_ids, tag_aliases).join(' '),
    enumerable: false,
  })

  return document
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

function getContentId(content_id: string) {
  return content_id
    .split('/')
    .at(-1)
    ?.replace(/\.json$/, '') ?? content_id
}

function resolveProductSearchImageUrl(product: Pick<Product, 'image_file'>): string {
  const image_url = resolveImageFileUrl(product.image_file, 'products')

  if (image_url === null) {
    throw new Error('Published product image_file is required')
  }

  return image_url
}

function resolveGuideSearchImageUrl(guide: Pick<Guide, 'image_file' | 'image_url'>): string | null {
  return resolveImageFileUrl(guide.image_file, 'guides')
}

function getTagLabels(tag_ids: string[], tag_labels: ReadonlyMap<string, string>) {
  return tag_ids.map((tag_id) => tag_labels.get(tag_id) ?? tag_id)
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

function getCategoryLabelMap(categories: CategoryDefinition[]) {
  return new Map(categories.map((category) => [category.id, category.label]))
}

function getChannelLabelMap(channels: ChannelDefinition[]) {
  return new Map(channels.map((channel) => [channel.id, channel.label]))
}

function getTagLabelMap(tags: TagDefinition[]) {
  return new Map(tags.map((tag) => [tag.id, tag.label]))
}

function getTagAliasMap(tags: TagDefinition[]) {
  return new Map(tags.map((tag) => [tag.id, tag.aliases]))
}

function compareProducts(left_product: Product, right_product: Product) {
  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return left_product.name.localeCompare(right_product.name)
}

function compareGuides(left_guide: Guide, right_guide: Guide) {
  const published_at_order = compareNullableTimestampDesc(left_guide.published_at, right_guide.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return left_guide.title.localeCompare(right_guide.title)
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
