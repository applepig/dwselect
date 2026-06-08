import type { CategoryDefinition, ChannelDefinition, LinkDefinition, Product } from './product-schema'

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
  description: string
  tags: string[]
  buy_cta: {
    label: string
    href: string
    target: '_blank'
    rel: 'noopener noreferrer'
  }
  fine_print: string
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
}

export type CompactAppTabId = 'home' | 'guide' | 'search' | 'links'

export type CompactAppState = {
  active_tab?: CompactAppTabId
  home_category_id?: Product['category_id'] | 'all'
  search_query?: string
  search_result_ids?: string[] | null
  selected_tags?: string[]
}

export type CompactRouteQueryValue = string | string[] | null | undefined

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

export type CompactLinkRow = {
  id: string
  title: string
  subtitle: string
  url: string
  icon: string
  target: '_blank'
  rel: 'noopener noreferrer'
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
    tag_chips: CompactTagChip[]
    selected_tags: string[]
    products: PublishedProductCard[]
    can_clear_tags: boolean
    empty_reason: 'no-products' | 'no-results' | null
  }
  search: {
    query: string
    products: PublishedProductCard[]
    empty_reason: 'empty-query' | 'no-results' | null
  }
  links: CompactLinkRow[]
  counts: {
    published: number
  }
}

const ALL_CATEGORIES_VALUE = '全部'

const DEFAULT_TAXONOMIES: TaxonomyDefinitions = {
  categories: [
    { id: 'home', label: '居家', short_label: '居家', sort_order: 10 },
    { id: 'kitchen', label: '廚房', short_label: '廚房', sort_order: 20 },
    { id: 'computer', label: '電腦', short_label: '電腦', sort_order: 30 },
    { id: 'three-c', label: '3C', short_label: '3C', sort_order: 40 },
    { id: 'av', label: '影音', short_label: '影音', sort_order: 50 },
    { id: 'food', label: '食材', short_label: '食材', sort_order: 60 },
    { id: 'other', label: '其他', short_label: '其他', sort_order: 999 },
  ],
  channels: [
    { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
    { id: 'momo', label: 'momo', tint: 'pink', host_patterns: ['www.momoshop.com.tw'], sort_order: 20 },
    { id: 'amazonjp', label: 'Amazon JP', tint: 'amber', host_patterns: ['www.amazon.co.jp', 'amzn.asia'], sort_order: 30 },
    { id: 'amazonus', label: 'Amazon US', tint: 'amber', host_patterns: ['www.amazon.com'], sort_order: 40 },
    { id: 'costco', label: 'Costco', tint: 'indigo', host_patterns: ['www.costco.com.tw'], sort_order: 50 },
    { id: 'other', label: '其他通路', tint: 'neutral', host_patterns: [], sort_order: 999 },
  ],
}

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
    title: 'applepig.idv.tw',
    subtitle: 'DW 的主站',
    url: 'https://applepig.idv.tw',
    icon: 'i-lucide-link',
    sort_order: 10,
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
    tags: [...product.tags],
    buy_cta: {
      label: `到 ${channel_definition.label} 購買`,
      href: product.purchase_url,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    fine_print: '價格與庫存以通路頁面為準。',
  }
}

export function getGroupedPublishedProducts(
  products: Product[],
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): GroupedPublishedProducts[] {
  return groupCardsByCategory(getPublishedProducts(products, taxonomies))
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
): CompactAppView {
  const active_tab = normalizeCompactTab(state.active_tab)
  const selected_category_id = state.home_category_id ?? 'all'
  const search_query = normalizeQuery(state.search_query)
  const published_products = products.filter((product) => product.status === 'published')
  const published_cards = published_products
    .toSorted(getProductComparator(taxonomies))
    .map((product) => mapProductToCard(product, taxonomies))
  const selected_tags = getNormalizedSelectedTags(state.selected_tags)
  const top_tags = getTopTags(published_cards, selected_tags)
  const home_products = selected_category_id === 'all'
    ? published_cards
    : published_cards.filter((product) => product.category_id === selected_category_id)
  const guide_products = getGuideProducts(published_cards, selected_tags)
  const search_products = getSearchProducts(published_cards, search_query, state.search_result_ids)

  return {
    tabs: COMPACT_APP_TABS.map((tab) => ({
      ...tab,
      active: tab.id === active_tab,
    })),
    active_tab,
    top_tags,
    home: {
      category_chips: getCompactCategoryChips(published_products, selected_category_id, taxonomies),
      products: home_products,
      empty_reason: getEmptyReason(published_cards.length, home_products.length),
    },
    guide: {
      tag_chips: top_tags,
      selected_tags,
      products: guide_products,
      can_clear_tags: selected_tags.length > 0,
      empty_reason: getEmptyReason(published_cards.length, guide_products.length),
    },
    search: {
      query: search_query,
      products: search_products,
      empty_reason: getSearchEmptyReason(search_query, search_products.length),
    },
    links: links
      .toSorted((left_link, right_link) => left_link.sort_order - right_link.sort_order)
      .map((link) => ({
        id: link.id,
        title: link.title,
        subtitle: link.subtitle,
        url: link.url,
        icon: link.icon,
        target: '_blank',
        rel: 'noopener noreferrer',
      })),
    counts: {
      published: published_cards.length,
    },
  }
}

export function getCompactAppStateFromRoute(
  route: CompactRouteState,
  options: CompactRouteStateOptions = {},
): CompactAppState {
  if (route.path === '/guide') {
    return {
      active_tab: 'guide',
      selected_tags: parseSelectedTags(route.query?.tags, options.tag_labels),
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
    tags: [...product.tags],
  }
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
    ...product.tags,
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
    ...Array.from(category_counts, ([category_id, count]) => ({
      label: getCategoryDefinition(category_id, taxonomies).label,
      value: category_id,
      count,
      active: category_id === active_category,
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

function getCompactCategoryChips(
  products: Product[],
  active_category_id: Product['category_id'] | 'all',
  taxonomies: TaxonomyDefinitions,
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
    ...Array.from(category_counts, ([category_id, count]) => {
      const category_definition = getCategoryDefinition(category_id, taxonomies)

      return {
        id: category_id,
        label: category_definition.short_label,
        count,
        active: category_id === active_category_id,
      }
    }),
  ]
}

function getTopTags(products: PublishedProductCard[], selected_tags: string[]): CompactTagChip[] {
  const selected_tag_set = new Set(selected_tags)
  const tag_counts = new Map<string, number>()

  for (const product of products) {
    for (const tag of product.tags) {
      tag_counts.set(tag, (tag_counts.get(tag) ?? 0) + 1)
    }
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
  })
}

function getGuideProducts(products: PublishedProductCard[], selected_tags: string[]) {
  if (selected_tags.length === 0) {
    return products
  }

  return products.filter((product) => selected_tags.every((tag) => product.tags.includes(tag)))
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
    sort_order: Number.MAX_SAFE_INTEGER,
  }
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

  return category_id
}

function parseSelectedTags(
  value: CompactRouteQueryValue,
  valid_tag_labels: CompactRouteStateOptions['tag_labels'],
) {
  const valid_tag_set = valid_tag_labels === undefined ? null : new Set(valid_tag_labels)
  const selected_tags = new Set<string>()

  // Why: tag 是 free-string label，可能含逗號。改用 Vue Router 原生 array query
  // （重複 param）後，每個 query value 就是一個完整 tag，不可再以逗號二次切割。
  for (const raw_value of getQueryValues(value)) {
    const normalized_tag = raw_value.trim()

    if (normalized_tag === '') {
      continue
    }

    if (valid_tag_set !== null && !valid_tag_set.has(normalized_tag)) {
      continue
    }

    selected_tags.add(normalized_tag)
  }

  return Array.from(selected_tags)
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
