import type { CategoryDefinition, ChannelDefinition, Guide, LinkDefinition, Product, TagDefinition } from './product-schema'
import type { SearchSuggestion } from './search/search-index'

export type PublishedProductCard = {
  id: string
  category: string
  category_id: Product['category_id']
  channel: string
  channel_id: Product['channel_id']
  description: string | null
  image: string
  name: string
  price: string
  purchase_link: string
  published_at: string | null
  summary: string
  tags: string[]
}

export type ProductDetailView = {
  id: string
  title: string
  hero_image: string
  hero_alt: string
  channel_label: string
  channel_id: Product['channel_id']
  category_label: string
  price_label: string
  dw_says: string
  description: string | null
  tags: string[]
  buy_cta: {
    label: string
    href: string
    target: '_blank'
    rel: 'noopener noreferrer'
  }
  fine_print: string
  related_products: PublishedProductCard[]
}

export type GroupedPublishedProducts = {
  category: string
  products: PublishedProductCard[]
}

export type CatalogSort = 'default' | 'latest' | 'name'

export type CatalogState = {
  query?: string
  category?: string
  sort?: CatalogSort | string
}

export type CatalogCategoryOption = {
  label: string
  value: string
  count: number
  active: boolean
}

export type CatalogSortOption = {
  label: string
  value: CatalogSort
  active: boolean
}

export type CatalogView = {
  products: PublishedProductCard[]
  sections: GroupedPublishedProducts[]
  category_options: CatalogCategoryOption[]
  sort_options: CatalogSortOption[]
  query: string
  category: string
  sort: CatalogSort
  counts: {
    published: number
    filtered: number
  }
  empty_reason: 'no-products' | 'no-results' | null
}

export type TaxonomyDefinitions = {
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags?: TagDefinition[]
}

export type CompactAppTabId = 'home' | 'guide' | 'search' | 'links'

export type CompactAppState = {
  active_tab?: CompactAppTabId
  home_category_id?: Product['category_id'] | 'all'
  search_query?: string
  search_result_ids?: string[] | null
  selected_tags?: string[]
}

export type CompactRouteQueryValue = string | Array<string | null> | null | undefined

export type CompactRouteState = {
  path: string
  query?: Record<string, CompactRouteQueryValue>
}

export type CompactRouteStateOptions = {
  category_ids?: string[]
  tag_labels?: string[]
}

export type CompactAppTab = {
  id: CompactAppTabId
  label: string
  icon: string
  active: boolean
}

export type CompactCategoryChip = {
  id: Product['category_id'] | 'all'
  label: string
  count: number
  active: boolean
}

export type CompactTagChip = {
  label: string
  count: number
  active: boolean
}

export type CompactResourceRow = {
  id: string
  type: 'product' | 'guide' | 'link'
  title: string
  subtitle: string
  meta: string | null
  href: string
  image_url: string | null
  icon: string | null
  external: boolean
  target: '_blank' | null
  rel: 'noopener noreferrer' | null
}

export type CompactLinkRow = CompactResourceRow
export type CompactGuideRow = CompactResourceRow

export type SearchResultSection = {
  id: 'products' | 'guides' | 'links'
  label: '商品' | '指南' | '連結'
  rows: CompactResourceRow[]
}

export type ResourceRowLinkAttributes
  = | {
    href: string
    target: '_blank'
    rel: 'noopener noreferrer'
  }
  | {
    to: string
  }

export type CompactAppView = {
  tabs: CompactAppTab[]
  active_tab: CompactAppTabId
  top_tags: CompactTagChip[]
  home: {
    category_chips: CompactCategoryChip[]
    products: PublishedProductCard[]
    empty_reason: 'no-products' | 'no-results' | null
  }
  guide: {
    guides: CompactResourceRow[]
    empty_reason: 'no-products' | 'no-results' | null
  }
  search: {
    query: string
    products: PublishedProductCard[]
    empty_reason: 'empty-query' | 'no-results' | null
  }
  links: CompactResourceRow[]
  counts: {
    published: number
  }
}

const ALL_CATEGORIES_VALUE = '全部'

const DEFAULT_TAXONOMIES: TaxonomyDefinitions = {
  categories: [
    { id: 'home', label: '居家', short_label: '居家', nav_visible: true, sort_order: 10 },
    { id: 'kitchen', label: '廚房', short_label: '廚房', nav_visible: true, sort_order: 20 },
    { id: 'computer', label: '電腦', short_label: '電腦', nav_visible: true, sort_order: 30 },
    { id: 'three-c', label: '3C', short_label: '3C', nav_visible: true, sort_order: 40 },
    { id: 'av', label: '影音', short_label: '影音', nav_visible: true, sort_order: 50 },
    { id: 'food', label: '食材', short_label: '食材', nav_visible: true, sort_order: 60 },
    { id: 'other', label: '其他', short_label: '其他', nav_visible: true, sort_order: 999 },
  ],
  channels: [
    { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
    { id: 'momo', label: 'momo', tint: 'pink', host_patterns: ['www.momoshop.com.tw'], sort_order: 20 },
    { id: 'amazonjp', label: 'Amazon JP', tint: 'amber', host_patterns: ['www.amazon.co.jp', 'amzn.asia'], sort_order: 30 },
    { id: 'amazonus', label: 'Amazon US', tint: 'amber', host_patterns: ['www.amazon.com'], sort_order: 40 },
    { id: 'costco', label: 'Costco', tint: 'indigo', host_patterns: ['www.costco.com.tw'], sort_order: 50 },
    { id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 999 },
  ],
  tags: [],
}

const PRODUCT_CATEGORY_IDS = new Set<Product['category_id']>(DEFAULT_TAXONOMIES.categories.map((category) => category.id))

const CATALOG_SORT_OPTIONS: Array<Omit<CatalogSortOption, 'active'>> = [
  { label: '預設排序', value: 'default' },
  { label: '最新上架', value: 'latest' },
  { label: '名稱排序', value: 'name' },
]

const COMPACT_APP_TABS: Array<Omit<CompactAppTab, 'active'>> = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search' },
  { id: 'links', label: '連結', icon: 'i-lucide-link' },
]

const DEFAULT_LINKS: LinkDefinition[] = [
  {
    id: 'applepig-home',
    status: 'published',
    title: 'applepig.idv.tw',
    summary: 'DW 的主站',
    url: 'https://applepig.idv.tw',
    icon: 'i-lucide-link',
    category_ids: ['other'],
    tag_ids: [],
    sort_order: 10,
    created_at: '2026-06-02T00:00:00+08:00',
    updated_at: '2026-06-02T00:00:00+08:00',
    published_at: '2026-06-02T00:00:00+08:00',
    unpublished_at: null,
    archived_at: null,
  },
]

export function getPublishedProducts(
  products: Product[],
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): PublishedProductCard[] {
  return products
    .filter((product) => product.status === 'published')
    .toSorted(getProductComparator(taxonomies))
    .map((product) => mapProductToCard(product, taxonomies))
}

export function getProductDetail(
  product: Product,
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): ProductDetailView {
  const channel_definition = getChannelDefinition(product.channel_id, taxonomies)
  const category_definition = getCategoryDefinition(product.category_id, taxonomies)
  const price_label = product.price.label ?? product.price_text

  return {
    id: getCatalogProductId(product),
    title: product.name,
    hero_image: product.image_url,
    hero_alt: product.name,
    channel_label: channel_definition.label,
    channel_id: product.channel_id,
    category_label: category_definition.label,
    price_label,
    dw_says: product.summary,
    description: product.description === product.summary ? null : product.description,
    tags: getTagLabels(product.tag_ids, taxonomies),
    buy_cta: {
      label: `到 ${channel_definition.label} 購買`,
      href: product.purchase_url,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    fine_print: '價格與庫存以通路頁面為準。',
    related_products: [],
  }
}

export function getRelatedProductCards(
  current_product: Product,
  products: Product[],
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): PublishedProductCard[] {
  const current_product_id = getCatalogProductId(current_product)

  return products
    .filter((product) => product.status === 'published')
    .filter((product) => getCatalogProductId(product) !== current_product_id)
    .toSorted((left_product, right_product) => compareRelatedProducts(current_product, left_product, right_product))
    .map((product) => mapProductToCard(product, taxonomies))
}

export function getGroupedPublishedProducts(
  products: Product[],
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): GroupedPublishedProducts[] {
  return groupCardsByCategory(getPublishedProducts(products, taxonomies))
}

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

export function getCatalogProductId(product: Pick<Product, 'id'>): string {
  return product.id
    .split('/')
    .at(-1)
    ?.replace(/\.json$/, '') ?? product.id
}

export function getCatalogSearchProducts(
  products: Product[],
  search_results: Array<Pick<PublishedProductCard, 'id'>>,
  query: string,
): Product[] {
  if (normalizeQuery(query) === '') {
    return products
  }

  const search_result_ids = new Set(search_results.map((result) => result.id))

  return products.filter((product) => search_result_ids.has(getCatalogProductId(product)))
}

export function getCatalogView(
  products: Product[],
  state: CatalogState = {},
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): CatalogView {
  const query = normalizeQuery(state.query)
  const category = state.category ?? ALL_CATEGORIES_VALUE
  const sort = normalizeSort(state.sort)
  const published_products = products.filter((product) => product.status === 'published')
  const category_options = getCategoryOptions(published_products, category, taxonomies)
  const filtered_products = published_products
    .filter((product) => matchesCategory(product, category))
    .filter((product) => matchesQuery(product, query, taxonomies))
    .toSorted(getCatalogComparator(sort, taxonomies))
  const published_cards = filtered_products.map((product) => mapProductToCard(product, taxonomies))

  return {
    products: published_cards,
    sections: groupCardsByCategory(published_cards),
    category_options,
    sort_options: CATALOG_SORT_OPTIONS.map((option) => ({
      ...option,
      active: option.value === sort,
    })),
    query,
    category,
    sort,
    counts: {
      published: published_products.length,
      filtered: published_cards.length,
    },
    empty_reason: getEmptyReason(published_products.length, published_cards.length),
  }
}

export function getCompactAppView(
  products: Product[],
  state: CompactAppState = {},
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
  links: LinkDefinition[] = DEFAULT_LINKS,
  guides: Guide[] = [],
): CompactAppView {
  const active_tab = normalizeCompactTab(state.active_tab)
  const selected_category_id = state.home_category_id ?? 'all'
  const search_query = normalizeQuery(state.search_query)
  const published_products = products.filter((product) => product.status === 'published')
  const published_cards = published_products
    .toSorted(getProductComparator(taxonomies))
    .map((product) => mapProductToCard(product, taxonomies))
  const selected_tags = getNormalizedSelectedTags(state.selected_tags)
  const top_tags = getTopTags({ products, guides, links }, selected_tags, taxonomies)
  const home_products = selected_category_id === 'all'
    ? published_cards
    : published_cards.filter((product) => product.category_id === selected_category_id)
  const guide_rows = getPublishedGuides(guides, taxonomies)
  const search_products = getSearchProducts(published_cards, search_query, state.search_result_ids)

  return {
    tabs: COMPACT_APP_TABS.map((tab) => ({
      ...tab,
      active: tab.id === active_tab,
    })),
    active_tab,
    top_tags,
    home: {
      category_chips: getCompactCategoryOptions(published_products, selected_category_id, taxonomies),
      products: home_products,
      empty_reason: getEmptyReason(published_cards.length, home_products.length),
    },
    guide: {
      guides: guide_rows,
      empty_reason: getEmptyReason(guide_rows.length, guide_rows.length),
    },
    search: {
      query: search_query,
      products: search_products,
      empty_reason: getSearchEmptyReason(search_query, search_products.length),
    },
    links: getPublishedLinks(links),
    counts: {
      published: published_cards.length,
    },
  }
}

export function getTagChips(
  content: {
    products: Product[]
    guides: Guide[]
    links: LinkDefinition[]
  },
  selected_tags: string[],
  taxonomies: TaxonomyDefinitions,
  max_count = 10,
): CompactTagChip[] {
  const selected_tag_set = new Set(selected_tags)
  const tag_counts = new Map<string, number>()

  for (const tag_id of getPublishedContentTagIds(content)) {
    const label = getTagLabel(tag_id, taxonomies)
    tag_counts.set(label, (tag_counts.get(label) ?? 0) + 1)
  }

  return Array.from(tag_counts, ([label, count]) => ({
    label,
    count,
    active: selected_tag_set.has(label),
  })).toSorted((left_tag, right_tag) => {
    if (left_tag.count !== right_tag.count) {
      return right_tag.count - left_tag.count
    }

    return compareText(left_tag.label, right_tag.label)
  }).slice(0, max_count)
}

export function getCompactAppStateFromRoute(
  route: CompactRouteState,
  options: CompactRouteStateOptions = {},
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
    home_category_id: parseCategoryId(route.query?.category, options.category_ids),
  }
}

function compareProducts(left_product: Product, right_product: Product, taxonomies: TaxonomyDefinitions) {
  const category_order = getCategorySortOrder(left_product.category_id, taxonomies)
    - getCategorySortOrder(right_product.category_id, taxonomies)

  if (category_order !== 0) {
    return category_order
  }

  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_product.name, right_product.name)
}

function compareProductsByLatest(left_product: Product, right_product: Product) {
  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_product.name, right_product.name)
}

function compareProductsByName(left_product: Product, right_product: Product, taxonomies: TaxonomyDefinitions) {
  const name_order = compareText(left_product.name, right_product.name)

  if (name_order !== 0) {
    return name_order
  }

  return compareProducts(left_product, right_product, taxonomies)
}

function compareText(left_value: string, right_value: string) {
  const left_chars = Array.from(left_value.normalize('NFKC'))
  const right_chars = Array.from(right_value.normalize('NFKC'))
  const length = Math.min(left_chars.length, right_chars.length)

  for (let i = 0; i < length; i += 1) {
    const left_code_point = left_chars[i]?.codePointAt(0) ?? 0
    const right_code_point = right_chars[i]?.codePointAt(0) ?? 0

    if (left_code_point !== right_code_point) {
      return left_code_point - right_code_point
    }
  }

  return left_chars.length - right_chars.length
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

function mapProductToCard(product: Product, taxonomies: TaxonomyDefinitions): PublishedProductCard {
  const category_definition = getCategoryDefinition(product.category_id, taxonomies)
  const channel_definition = getChannelDefinition(product.channel_id, taxonomies)

  return {
    id: getCatalogProductId(product),
    category: category_definition.label,
    category_id: product.category_id,
    channel: channel_definition.label,
    channel_id: product.channel_id,
    description: product.description,
    image: product.image_url,
    name: product.name,
    price: product.price_text,
    purchase_link: product.purchase_url,
    published_at: product.published_at,
    summary: product.summary,
    tags: getTagLabels(product.tag_ids, taxonomies),
  }
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

function getProductComparator(taxonomies: TaxonomyDefinitions) {
  return (left_product: Product, right_product: Product) => compareProducts(left_product, right_product, taxonomies)
}

function getCatalogComparator(sort: CatalogSort, taxonomies: TaxonomyDefinitions) {
  if (sort === 'latest') {
    return compareProductsByLatest
  }

  if (sort === 'name') {
    return (left_product: Product, right_product: Product) => compareProductsByName(left_product, right_product, taxonomies)
  }

  return getProductComparator(taxonomies)
}

function normalizeSort(sort: CatalogState['sort']): CatalogSort {
  if (sort === 'default' || sort === 'latest' || sort === 'name') {
    return sort
  }

  return 'default'
}

function normalizeQuery(query: string | undefined) {
  return query?.trim() ?? ''
}

function matchesCategory(product: Product, category: string) {
  return category === ALL_CATEGORIES_VALUE || product.category_id === category
}

function matchesQuery(product: Product, query: string, taxonomies: TaxonomyDefinitions) {
  if (query === '') {
    return true
  }

  const normalized_query = query.toLocaleLowerCase()
  const category_definition = getCategoryDefinition(product.category_id, taxonomies)
  const channel_definition = getChannelDefinition(product.channel_id, taxonomies)
  const searchable_text = [
    product.name,
    product.summary,
    product.description,
    category_definition.label,
    channel_definition.label,
    ...getTagLabels(product.tag_ids, taxonomies),
  ].join(' ').toLocaleLowerCase()

  return searchable_text.includes(normalized_query)
}

function matchesCardQuery(product: PublishedProductCard, query: string) {
  const normalized_query = query.toLocaleLowerCase()
  const searchable_text = [
    product.name,
    product.summary,
    product.description,
    product.category,
    product.channel,
    product.price,
    ...product.tags,
  ].join(' ').toLocaleLowerCase()

  return searchable_text.includes(normalized_query)
}

function getCategoryOptions(
  products: Product[],
  active_category: string,
  taxonomies: TaxonomyDefinitions,
): CatalogCategoryOption[] {
  const category_counts = new Map<Product['category_id'], number>()

  for (const product of products.toSorted(getProductComparator(taxonomies))) {
    category_counts.set(product.category_id, (category_counts.get(product.category_id) ?? 0) + 1)
  }

  return [
    {
      label: ALL_CATEGORIES_VALUE,
      value: ALL_CATEGORIES_VALUE,
      count: products.length,
      active: active_category === ALL_CATEGORIES_VALUE,
    },
    ...getVisibleCategories(taxonomies).map((category) => ({
      label: category.label,
      value: category.id,
      count: category_counts.get(category.id) ?? 0,
      active: category.id === active_category,
    })),
  ]
}

function groupCardsByCategory(products: PublishedProductCard[]): GroupedPublishedProducts[] {
  const grouped_products = new Map<string, PublishedProductCard[]>()

  for (const product of products) {
    const category_products = grouped_products.get(product.category) ?? []
    category_products.push(product)
    grouped_products.set(product.category, category_products)
  }

  return Array.from(grouped_products, ([category, category_products]) => ({
    category,
    products: category_products,
  }))
}

export function getCompactCategoryOptions(
  products: Product[],
  active_category_id: Product['category_id'] | 'all',
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): CompactCategoryChip[] {
  const published_products = products.filter((product) => product.status === 'published')
  const category_counts = new Map<Product['category_id'], number>()

  for (const product of published_products.toSorted(getProductComparator(taxonomies))) {
    category_counts.set(product.category_id, (category_counts.get(product.category_id) ?? 0) + 1)
  }

  return [
    {
      id: 'all',
      label: '全部',
      count: published_products.length,
      active: active_category_id === 'all',
    },
    ...getVisibleCategories(taxonomies)
      .map((category) => ({
        id: category.id,
        label: category.short_label,
        count: category_counts.get(category.id) ?? 0,
        active: category.id === active_category_id,
      }))
      .filter((category) => category.count > 0),
  ]
}

function compareRelatedProducts(current_product: Product, left_product: Product, right_product: Product) {
  const left_score = getRelatedProductScore(current_product, left_product)
  const right_score = getRelatedProductScore(current_product, right_product)

  if (left_score.same_category !== right_score.same_category) {
    return Number(right_score.same_category) - Number(left_score.same_category)
  }

  if (left_score.shared_tag_count !== right_score.shared_tag_count) {
    return right_score.shared_tag_count - left_score.shared_tag_count
  }

  if (left_score.same_channel !== right_score.same_channel) {
    return Number(right_score.same_channel) - Number(left_score.same_channel)
  }

  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_product.name, right_product.name)
}

function getRelatedProductScore(current_product: Product, candidate_product: Product) {
  const current_tag_ids = new Set(current_product.tag_ids)
  const shared_tag_count = candidate_product.tag_ids
    .filter((tag_id) => current_tag_ids.has(tag_id))
    .length

  return {
    same_category: candidate_product.category_id === current_product.category_id,
    shared_tag_count,
    same_channel: candidate_product.channel_id === current_product.channel_id,
  }
}

function getTopTags(
  content: {
    products: Product[]
    guides: Guide[]
    links: LinkDefinition[]
  },
  selected_tags: string[],
  taxonomies: TaxonomyDefinitions,
): CompactTagChip[] {
  return getTagChips(content, selected_tags, taxonomies, 10)
}

function getPublishedContentTagIds(content: {
  products: Product[]
  guides: Guide[]
  links: LinkDefinition[]
}) {
  return [
    ...content.products
      .filter((product) => product.status === 'published')
      .flatMap((product) => product.tag_ids),
    ...content.guides
      .filter((guide) => guide.status === 'published')
      .flatMap((guide) => guide.tag_ids),
    ...content.links
      .filter((link) => link.status === 'published')
      .flatMap((link) => link.tag_ids),
  ]
}

function compareGuides(left_guide: Guide, right_guide: Guide) {
  const published_at_order = compareNullableTimestampDesc(left_guide.published_at, right_guide.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_guide.title, right_guide.title)
}

function getSearchProducts(
  products: PublishedProductCard[],
  query: string,
  search_result_ids: CompactAppState['search_result_ids'],
) {
  if (query === '') {
    return []
  }

  if (Array.isArray(search_result_ids)) {
    const products_by_id = new Map(products.map((product) => [product.id, product]))

    return search_result_ids
      .map((product_id) => products_by_id.get(product_id))
      .filter((product): product is PublishedProductCard => product !== undefined)
  }

  return products.filter((product) => matchesCardQuery(product, query))
}

function getCategoryDefinition(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions) {
  return taxonomies.categories.find((category) => category.id === category_id) ?? {
    id: category_id,
    label: category_id,
    short_label: category_id,
    nav_visible: false,
    sort_order: Number.MAX_SAFE_INTEGER,
  }
}

function getVisibleCategories(taxonomies: TaxonomyDefinitions) {
  return taxonomies.categories
    .filter((category) => category.nav_visible)
    .toSorted((left_category, right_category) => left_category.sort_order - right_category.sort_order)
}

function getTagLabels(tag_ids: string[], taxonomies: TaxonomyDefinitions) {
  return tag_ids.map((tag_id) => getTagLabel(tag_id, taxonomies))
}

function getTagLabel(tag_id: string, taxonomies: TaxonomyDefinitions) {
  return taxonomies.tags?.find((tag) => tag.id === tag_id)?.label ?? tag_id
}

function getChannelDefinition(channel_id: Product['channel_id'], taxonomies: TaxonomyDefinitions) {
  return taxonomies.channels.find((channel) => channel.id === channel_id) ?? {
    id: channel_id,
    label: channel_id,
    tint: 'neutral',
    host_patterns: [],
    sort_order: Number.MAX_SAFE_INTEGER,
  }
}

function getCategorySortOrder(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions) {
  return getCategoryDefinition(category_id, taxonomies).sort_order
}

function getEmptyReason(published_count: number, filtered_count: number): CatalogView['empty_reason'] {
  if (published_count === 0) {
    return 'no-products'
  }

  if (filtered_count === 0) {
    return 'no-results'
  }

  return null
}

function getSearchEmptyReason(query: string, filtered_count: number): CompactAppView['search']['empty_reason'] {
  if (query === '') {
    return 'empty-query'
  }

  if (filtered_count === 0) {
    return 'no-results'
  }

  return null
}

function normalizeCompactTab(tab: CompactAppState['active_tab']): CompactAppTabId {
  if (tab === 'guide' || tab === 'search' || tab === 'links') {
    return tab
  }

  return 'home'
}

function parseCategoryId(
  value: CompactRouteQueryValue,
  valid_category_ids: CompactRouteStateOptions['category_ids'],
): Product['category_id'] | 'all' {
  const category_id = getFirstQueryValue(value).trim()

  if (category_id === '' || category_id === 'all') {
    return 'all'
  }

  if (valid_category_ids !== undefined && !valid_category_ids.includes(category_id)) {
    return 'all'
  }

  if (!isProductCategoryId(category_id)) {
    return 'all'
  }

  return category_id
}

function isProductCategoryId(value: string): value is Product['category_id'] {
  return PRODUCT_CATEGORY_IDS.has(value as Product['category_id'])
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

function getNormalizedSelectedTags(tags: CompactAppState['selected_tags']) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter((tag) => tag !== '')))
}
