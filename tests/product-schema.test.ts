import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parse } from 'node:path'

import {
  category_taxonomy_schema,
  channel_taxonomy_schema,
  link_taxonomy_schema,
  product_schema,
} from '../app/utils/product-schema'

const valid_product = {
  id: '2026-06-02-sample-product',
  status: 'published',
  name: '商品名稱',
  price_text: 'NT$ 1,990',
  price: {
    amount: 1990,
    currency: 'TWD',
    unit: 'each',
    label: null,
  },
  summary: '推薦短評',
  description: '推薦文或商品描述',
  purchase_url: 'https://example.com/product',
  image_url: 'https://example.com/product.jpg',
  channel_id: 'other',
  category_id: 'home',
  tags: ['tag-a', 'tag-b'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const products_dir_url = new URL('../content/products/', import.meta.url)
const taxonomies_dir_url = new URL('../content/taxonomies/', import.meta.url)

function readTaxonomy(file_name: string) {
  return JSON.parse(readFileSync(new URL(file_name, taxonomies_dir_url), 'utf8'))
}

function readContentProductEntries() {
  return readdirSync(products_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => ({
      file_name,
      file_stem: parse(file_name).name,
      content: JSON.parse(readFileSync(new URL(file_name, products_dir_url), 'utf8')),
    }))
}

describe('product schema', () => {
  it('should accept a valid product document', () => {
    expect(() => product_schema.parse(valid_product)).not.toThrow()
  })

  it('should accept the fallback other category for migrated unknown categories', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      category_id: 'other',
    })).not.toThrow()
  })

  it('should reject status outside allowed enum', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      status: 'deleted',
    })).toThrow()
  })

  it('should reject non HTTP(S) product URLs', () => {
    for (const purchase_url of ['javascript:alert(1)', 'data:text/plain,test', '/relative-path']) {
      expect(() => product_schema.parse({
        ...valid_product,
        purchase_url,
      })).toThrow()
    }
  })

  it('should reject non HTTP(S) image URLs', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      image_url: 'ftp://example.com/product.jpg',
    })).toThrow()
  })

  it('should allow empty reference URL as null', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      reference_url: null,
    })).not.toThrow()
  })

  it('should reject invalid non-empty reference URL', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      reference_url: 'mailto:test@example.com',
    })).toThrow()
  })

  it('should reject invalid timestamp format', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      created_at: '2026-06-02',
    })).toThrow()
  })

  it('should allow draft products to keep historical published timestamp', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      status: 'draft',
      published_at: '2026-06-01T00:00:00+08:00',
    })).not.toThrow()
  })

  it('should reject the legacy category field after compact schema migration', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      category: '居家',
    })).toThrow()
  })

  it('should validate taxonomy content for channels, categories and links', () => {
    const channels = channel_taxonomy_schema.parse(readTaxonomy('channels.json'))
    const categories = category_taxonomy_schema.parse(readTaxonomy('categories.json'))
    const links = link_taxonomy_schema.parse(readTaxonomy('links.json'))

    expect(channels.items.map((channel) => channel.id)).toEqual([
      'pchome',
      'momo',
      'amazonjp',
      'amazonus',
      'costco',
      'other',
    ])
    expect(categories.items.map((category) => [category.id, category.label])).toEqual([
      ['home', '居家'],
      ['kitchen', '廚房'],
      ['computer', '電腦'],
      ['three-c', '3C'],
      ['av', '影音'],
      ['food', '食材'],
      ['other', '其他'],
    ])
    expect(links.items).toEqual([
      {
        id: 'applepig-home',
        title: 'applepig.idv.tw',
        subtitle: 'DW 的主站',
        url: 'https://applepig.idv.tw',
        icon: 'i-lucide-link',
        sort_order: 10,
      },
    ])
  })

  it('should validate all compact product content and keep ids equal to filename stems', () => {
    const product_entries = readContentProductEntries()
    const channel_ids = new Set(channel_taxonomy_schema.parse(readTaxonomy('channels.json')).items.map((channel) => channel.id))
    const category_ids = new Set(category_taxonomy_schema.parse(readTaxonomy('categories.json')).items.map((category) => category.id))

    expect(product_entries).toHaveLength(66)
    expect(product_entries.map((entry) => entry.file_name)).not.toContain('2026-06-02-sample-product.json')
    for (const entry of product_entries) {
      expect(entry.content.id).toBe(entry.file_stem)
      expect(entry.content).not.toHaveProperty('category')
      expect(() => product_schema.parse(entry.content)).not.toThrow()
      expect(channel_ids.has(entry.content.channel_id)).toBe(true)
      expect(category_ids.has(entry.content.category_id)).toBe(true)
    }
  })
})
