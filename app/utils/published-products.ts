import type { Product } from './product-schema'

export type PublishedProductCard = {
  id: string
  category: string
  description: string
  image: string
  name: string
  price: string
  purchase_link: string
  published_at: string | null
  tags: string[]
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

const ALL_CATEGORIES_VALUE = '全部'

const CATALOG_SORT_OPTIONS: Array<Omit<CatalogSortOption, 'active'>> = [
  { label: '預設排序', value: 'default' },
  { label: '最新上架', value: 'latest' },
  { label: '名稱排序', value: 'name' },
]

export function getPublishedProducts(products: Product[]): PublishedProductCard[] {
  return products
    .filter((product) => product.status === 'published')
    .toSorted(compareProducts)
    .map(mapProductToCard)
}

export function getGroupedPublishedProducts(products: Product[]): GroupedPublishedProducts[] {
  return groupCardsByCategory(getPublishedProducts(products))
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

export function getCatalogView(products: Product[], state: CatalogState = {}): CatalogView {
  const query = normalizeQuery(state.query)
  const category = state.category ?? ALL_CATEGORIES_VALUE
  const sort = normalizeSort(state.sort)
  const published_products = products.filter((product) => product.status === 'published')
  const category_options = getCategoryOptions(published_products, category)
  const filtered_products = published_products
    .filter((product) => matchesCategory(product, category))
    .filter((product) => matchesQuery(product, query))
    .toSorted(getCatalogComparator(sort))
  const published_cards = filtered_products.map(mapProductToCard)

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

function compareProducts(left_product: Product, right_product: Product) {
  const category_order = compareText(left_product.category, right_product.category)

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

function compareProductsByName(left_product: Product, right_product: Product) {
  const name_order = compareText(left_product.name, right_product.name)

  if (name_order !== 0) {
    return name_order
  }

  return compareProducts(left_product, right_product)
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

function mapProductToCard(product: Product): PublishedProductCard {
  return {
    id: getCatalogProductId(product),
    category: product.category,
    description: product.description,
    image: product.image_url,
    name: product.name,
    price: product.price_text,
    purchase_link: product.purchase_url,
    published_at: product.published_at,
    tags: [...product.tags],
  }
}

function getCatalogComparator(sort: CatalogSort) {
  if (sort === 'latest') {
    return compareProductsByLatest
  }

  if (sort === 'name') {
    return compareProductsByName
  }

  return compareProducts
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
  return category === ALL_CATEGORIES_VALUE || product.category === category
}

function matchesQuery(product: Product, query: string) {
  if (query === '') {
    return true
  }

  const normalized_query = query.toLocaleLowerCase()
  const searchable_text = [
    product.name,
    product.description,
    product.category,
    ...product.tags,
  ].join(' ').toLocaleLowerCase()

  return searchable_text.includes(normalized_query)
}

function getCategoryOptions(products: Product[], active_category: string): CatalogCategoryOption[] {
  const category_counts = new Map<string, number>()

  for (const product of products.toSorted(compareProducts)) {
    category_counts.set(product.category, (category_counts.get(product.category) ?? 0) + 1)
  }

  return [
    {
      label: ALL_CATEGORIES_VALUE,
      value: ALL_CATEGORIES_VALUE,
      count: products.length,
      active: active_category === ALL_CATEGORIES_VALUE,
    },
    ...Array.from(category_counts, ([category, count]) => ({
      label: category,
      value: category,
      count,
      active: category === active_category,
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

function getEmptyReason(published_count: number, filtered_count: number): CatalogView['empty_reason'] {
  if (published_count === 0) {
    return 'no-products'
  }

  if (filtered_count === 0) {
    return 'no-results'
  }

  return null
}
