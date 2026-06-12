import type { Product } from '../product-schema'
import type { PublishedProductCard, TaxonomyDefinitions } from './types'

export const DEFAULT_TAXONOMIES: TaxonomyDefinitions = {
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
  tags: [
    {
      id: 'display',
      label: '顯示設備',
      description: '螢幕、電視與影像顯示相關屬性。',
      aliases: ['電視', '螢幕'],
      nav_visible: true,
      sort_order: 10,
    },
    {
      id: 'ergonomic',
      label: '人體工學',
      description: '人體工學、坐姿、工作站與長時間使用舒適度相關屬性。',
      aliases: ['人體工學', '電腦椅'],
      nav_visible: true,
      sort_order: 20,
    },
    {
      id: 'rice',
      label: '米食',
      description: '白米、糙米、米飯料理與米類研究相關屬性。',
      aliases: ['米'],
      nav_visible: true,
      sort_order: 30,
    },
  ],
}

export function getPublishedProducts(
  products: Product[],
  taxonomies: TaxonomyDefinitions = DEFAULT_TAXONOMIES,
): PublishedProductCard[] {
  return products
    .filter((product) => product.status === 'published')
    .toSorted((left_product, right_product) => compareProducts(left_product, right_product, taxonomies))
    .map((product) => mapProductToCard(product, taxonomies))
}

export function mapProductToCard(product: Product, taxonomies: TaxonomyDefinitions): PublishedProductCard {
  const category_definition = getCategoryDefinition(product.category_id, taxonomies)
  const channel_definition = getChannelDefinition(product.channel_id, taxonomies)

  return {
    id: getProductCardId(product),
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

export function getCategoryDefinition(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions) {
  return taxonomies.categories.find((category) => category.id === category_id) ?? {
    id: category_id,
    label: category_id,
    short_label: category_id,
    nav_visible: false,
    sort_order: Number.MAX_SAFE_INTEGER,
  }
}

export function getChannelDefinition(channel_id: Product['channel_id'], taxonomies: TaxonomyDefinitions) {
  return taxonomies.channels.find((channel) => channel.id === channel_id) ?? {
    id: channel_id,
    label: channel_id,
    tint: 'neutral',
    host_patterns: [],
    sort_order: Number.MAX_SAFE_INTEGER,
  }
}

export function getCategorySortOrder(category_id: Product['category_id'], taxonomies: TaxonomyDefinitions) {
  return getCategoryDefinition(category_id, taxonomies).sort_order
}

export function compareText(left_value: string, right_value: string) {
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

function compareProducts(left_product: Product, right_product: Product, taxonomies: TaxonomyDefinitions) {
  const category_order = getCategorySortOrder(left_product.category_id, taxonomies)
    - getCategorySortOrder(right_product.category_id, taxonomies)

  if (category_order !== 0) {
    return category_order
  }

  return compareProductsByLatest(left_product, right_product)
}

function compareProductsByLatest(left_product: Product, right_product: Product) {
  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_product.name, right_product.name)
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

function getTagLabels(tag_ids: string[], taxonomies: TaxonomyDefinitions) {
  return tag_ids.map((tag_id) => getTagLabel(tag_id, taxonomies))
}

function getTagLabel(tag_id: string, taxonomies: TaxonomyDefinitions) {
  return taxonomies.tags?.find((tag) => tag.id === tag_id)?.label ?? tag_id
}

function getProductCardId(product: Pick<Product, 'id'>): string {
  return product.id
    .split('/')
    .at(-1)
    ?.replace(/\.json$/, '') ?? product.id
}
