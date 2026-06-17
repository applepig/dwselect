import { readFileSync, readdirSync } from 'node:fs'

import type { Guide, LinkDefinition, Product, TagDefinition } from '../../app/utils/product-schema'
import type { TaxonomyDefinitions } from '../../app/utils/published-products/types'

export const products_dir_url = new URL('../../content/products/', import.meta.url)
export const guides_dir_url = new URL('../../content/guides/', import.meta.url)
export const links_dir_url = new URL('../../content/links/', import.meta.url)

export const base_product = {
  english_name: 'Sample Product',
  summary: '推薦短評',
  long_description: '推薦文',
  llm_description: '',
  search_aliases: [],
  model_numbers: [],
  offers: [
    {
      channel_id: 'other',
      url: 'https://example.com/product',
      price_text: 'NT$ 1,990',
      price: {
        amount: 1990,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      checked_at: '2026-06-02T00:00:00+08:00',
    },
  ],
  image_file: 'sample-product.jpg',
  image_url: null,
  category_id: 'home',
  tag_ids: ['tag-a'],
  reference_url: null,
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
} satisfies Omit<Product, 'id' | 'status' | 'name'>

export const test_taxonomies: TaxonomyDefinitions = {
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
    { id: 'tag-a', label: '標籤 A', description: '測試標籤 A', aliases: [], nav_visible: true, sort_order: 10 },
    { id: 'typing', label: '輸入', description: '輸入設備', aliases: [], nav_visible: true, sort_order: 20 },
    { id: 'wireless', label: '無線', description: '無線設備', aliases: [], nav_visible: true, sort_order: 30 },
    { id: 'shared-token', label: '共同關鍵字', description: '共同關鍵字', aliases: [], nav_visible: true, sort_order: 40 },
  ] satisfies TagDefinition[],
  brands: [],
}

export const test_links: LinkDefinition[] = [
  {
    id: 'applepig-home',
    status: 'published',
    title: 'applepig.idv.tw',
    summary: 'DW 的主站',
    url: 'https://applepig.idv.tw',
    image_url: null,
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

export const base_guide = {
  status: 'published',
  title: '指南文章',
  summary: '指南摘要',
  source_url: 'https://example.com/guide',
  image_url: null,
  category_ids: ['computer'],
  tag_ids: ['typing'],
  related_product_ids: [],
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
} satisfies Omit<Guide, 'id'>

export const test_guides: Guide[] = [
  {
    ...base_guide,
    id: 'guide-keyboard',
    title: '鍵盤入門',
    summary: '挑選鍵盤前先看這篇',
    source_url: 'https://example.com/keyboard-guide',
    image_url: 'https://example.com/keyboard-guide.jpg',
    category_ids: ['computer'],
    tag_ids: ['typing'],
    published_at: '2026-06-03T00:00:00+08:00',
  },
]

export function makeProduct(product: Partial<Product> & Pick<Product, 'id' | 'status' | 'name'>): Product {
  return {
    ...base_product,
    ...product,
  }
}

export function readContentProducts(): Product[] {
  return readdirSync(products_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => JSON.parse(readFileSync(new URL(file_name, products_dir_url), 'utf8')) as Product)
}

export function readContentGuides(): Guide[] {
  return readdirSync(guides_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => JSON.parse(readFileSync(new URL(file_name, guides_dir_url), 'utf8')) as Guide)
}

export function readContentLinks(): LinkDefinition[] {
  return readdirSync(links_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => JSON.parse(readFileSync(new URL(file_name, links_dir_url), 'utf8')) as LinkDefinition)
}
