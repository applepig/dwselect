import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parse } from 'node:path'

import {
  category_taxonomy_schema,
  channel_taxonomy_schema,
  guide_schema,
  link_schema,
  product_schema,
  tag_taxonomy_schema as brand_taxonomy_schema,
  tag_taxonomy_schema,
  validateContentTaxonomyReferences,
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
  tag_ids: ['tag-a', 'tag-b'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const valid_guide = {
  id: 'sample-guide',
  status: 'published',
  title: '指南標題',
  summary: '指南摘要',
  source_url: 'https://example.com/guide',
  image_url: null,
  category_ids: ['home'],
  tag_ids: ['tag-a'],
  related_product_ids: ['2026-06-02-sample-product'],
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const valid_link = {
  id: 'sample-link',
  status: 'published',
  title: '連結標題',
  summary: '連結摘要',
  url: 'https://example.com/link',
  icon: 'i-lucide-link',
  category_ids: ['home'],
  tag_ids: ['tag-a'],
  sort_order: 10,
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const products_dir_url = new URL('../content/products/', import.meta.url)
const guides_dir_url = new URL('../content/guides/', import.meta.url)
const links_dir_url = new URL('../content/links/', import.meta.url)
const taxonomies_dir_url = new URL('../content/taxonomies/', import.meta.url)
const LEGACY_PLATFORM_TAGS = ['PCHome', 'momo', '日亞', '美亞']
const LEGACY_ROOT_CATEGORY_TAGS = ['居家', '電腦', '廚房', '3C', '影音', '食材']
const KEBAB_CASE_ASCII_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

function readContentGuideEntries() {
  return readContentEntries(guides_dir_url)
}

function readContentLinkEntries() {
  return readContentEntries(links_dir_url)
}

function readContentEntries(directory_url: URL) {
  return readdirSync(directory_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => ({
      file_name,
      file_stem: parse(file_name).name,
      content: JSON.parse(readFileSync(new URL(file_name, directory_url), 'utf8')),
    }))
}

describe('product schema', () => {
  it('should accept a valid product document', () => {
    expect(() => product_schema.parse(valid_product)).not.toThrow()
  })

  it('should reject legacy free-string product tags', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      tags: ['legacy-tag'],
    })).toThrow()
  })

  it('should allow empty product tag ids after taxonomy cleanup', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      tag_ids: [],
    })).not.toThrow()
  })

  it('should accept the fallback other category for migrated unknown categories', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      category_id: 'other',
    })).not.toThrow()
  })

  it('should accept kebab-case ASCII product category and channel ids without hardcoded enum coupling', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      category_id: 'new-audio-gear',
      channel_id: 'new-shop-24h',
    })).not.toThrow()
  })

  it('should reject malformed product category and channel ids', () => {
    for (const invalid_id of ['NewCategory', 'new_category', 'new category', '新分類', '-new-category', 'new-category-']) {
      expect(() => product_schema.parse({
        ...valid_product,
        category_id: invalid_id,
      })).toThrow()
      expect(() => product_schema.parse({
        ...valid_product,
        channel_id: invalid_id,
      })).toThrow()
    }
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

  it('should accept local image URLs from products and guides', () => {
    for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']) {
      expect(() => product_schema.parse({
        ...valid_product,
        image_url: `/images/products/2026-06-02-sample-product.${extension}`,
      })).not.toThrow()

      expect(() => guide_schema.parse({
        ...valid_guide,
        image_url: `/images/guides/sample-guide.${extension}`,
      })).not.toThrow()
    }
  })

  it('should reject malformed or unsupported local image URLs', () => {
    const invalid_local_image_urls = [
      '/images/products/',
      '/images/products//',
      '/images/products/sample-product',
      '/images/products/sample-product.bmp',
      '/images/products/subdir/sample-product.jpg',
      '/images/other/sample-product.jpg',
      'images/products/sample-product.jpg',
      '/images/products/../secret.jpg',
      '/images/products/sample-product.jpg?v=1',
      '/images/guides/sample-guide.jpg#x',
    ]

    for (const image_url of invalid_local_image_urls) {
      expect(() => product_schema.parse({
        ...valid_product,
        image_url,
      })).toThrow()
    }
  })

  it('should keep rejecting javascript: and data: URLs for image fields', () => {
    expect(() => product_schema.parse({
      ...valid_product,
      image_url: 'javascript:alert(1)',
    })).toThrow()
    expect(() => guide_schema.parse({
      ...valid_guide,
      image_url: 'data:text/plain,test',
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

  it('should accept valid guide and link content documents', () => {
    expect(() => guide_schema.parse(valid_guide)).not.toThrow()
    expect(() => link_schema.parse(valid_link)).not.toThrow()
  })

  it('should accept link content with an optional image URL', () => {
    expect(() => link_schema.parse({
      ...valid_link,
      image_url: 'https://example.com/link-logo.png',
    })).not.toThrow()
    expect(() => link_schema.parse({
      ...valid_link,
      image_url: '/images/guides/sample-link.png',
    })).not.toThrow()
    expect(() => link_schema.parse({
      ...valid_link,
      image_url: null,
    })).not.toThrow()
    expect(() => link_schema.parse(valid_link)).not.toThrow()
  })

  it('should reject non HTTP(S) guide and link URLs', () => {
    expect(() => guide_schema.parse({
      ...valid_guide,
      source_url: '/relative-guide',
    })).toThrow()
    expect(() => guide_schema.parse({
      ...valid_guide,
      image_url: 'ftp://example.com/guide.jpg',
    })).toThrow()
    expect(() => link_schema.parse({
      ...valid_link,
      url: 'mailto:hello@example.com',
    })).toThrow()
    expect(() => link_schema.parse({
      ...valid_link,
      image_url: 'ftp://example.com/link.jpg',
    })).toThrow()
  })

  it('should validate taxonomy content shape, unique ids and sort order', () => {
    const channels = channel_taxonomy_schema.parse(readTaxonomy('channels.json'))
    const categories = category_taxonomy_schema.parse(readTaxonomy('categories.json'))
    const tags = tag_taxonomy_schema.parse(readTaxonomy('tags.json'))
    const brands = brand_taxonomy_schema.parse(readTaxonomy('brands.json'))

    expectTaxonomyIdsToBeKebabCaseAndUnique(channels.items)
    expectTaxonomyIdsToBeKebabCaseAndUnique(categories.items)
    expectTaxonomyIdsToBeKebabCaseAndUnique(tags.items)
    expectTaxonomyIdsToBeKebabCaseAndUnique(brands.items)
    expectTaxonomyIdsNotToCollide(tags.items, brands.items)
    expectSortOrderToBeAscending(channels.items)
    expectSortOrderToBeAscending(categories.items)
    expectSortOrderToBeAscending(tags.items)
    expectSortOrderToBeAscending(brands.items)
    expect(categories.items.every((category) => category.label !== '' && category.short_label !== '')).toBe(true)
    expect(channels.items.every((channel) => channel.label !== '' && channel.tint !== '')).toBe(true)
    expect(tags.items.every((tag) => tag.label !== '')).toBe(true)
    expect(tags.items).not.toContainEqual(expect.objectContaining({ id: 'PCHome' }))
    expect(tags.items).not.toContainEqual(expect.objectContaining({ id: 'home' }))
  })

  it('should report missing tag and category references across content domains', () => {
    const reference_violations = validateContentTaxonomyReferences({
      products: [
        {
          ...valid_product,
          id: 'missing-product-references',
          category_id: 'missing-category',
          tag_ids: ['tag-a', 'missing-tag'],
        },
      ],
      guides: [
        {
          ...valid_guide,
          id: 'missing-guide-references',
          category_ids: ['missing-guide-category'],
        },
      ],
      links: [
        {
          ...valid_link,
          id: 'missing-link-references',
          tag_ids: ['missing-link-tag'],
        },
      ],
      categories: [
        { id: 'home', label: '居家', short_label: '居家', nav_visible: true, sort_order: 10 },
      ],
      tags: [
        { id: 'tag-a', label: 'Tag A', description: '測試 tag', aliases: [], nav_visible: true, sort_order: 10 },
      ],
      brands: [
        { id: 'brand-a', label: 'Brand A', description: '測試 brand', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    })

    expect(reference_violations).toEqual([
      { content_type: 'product', content_id: 'missing-product-references', field: 'category_id', value: 'missing-category' },
      { content_type: 'product', content_id: 'missing-product-references', field: 'tag_ids', value: 'missing-tag' },
      { content_type: 'guide', content_id: 'missing-guide-references', field: 'category_ids', value: 'missing-guide-category' },
      { content_type: 'link', content_id: 'missing-link-references', field: 'tag_ids', value: 'missing-link-tag' },
    ])
  })

  it('should allow product tag ids to reference brands but keep guides and links limited to tags', () => {
    const reference_violations = validateContentTaxonomyReferences({
      products: [
        {
          ...valid_product,
          id: 'product-with-brand-reference',
          tag_ids: ['tag-a', 'brand-a'],
        },
      ],
      guides: [
        {
          ...valid_guide,
          id: 'guide-with-brand-reference',
          tag_ids: ['brand-a'],
        },
      ],
      links: [
        {
          ...valid_link,
          id: 'link-with-brand-reference',
          tag_ids: ['brand-a'],
        },
      ],
      categories: [
        { id: 'home', label: '居家', short_label: '居家', nav_visible: true, sort_order: 10 },
      ],
      tags: [
        { id: 'tag-a', label: 'Tag A', description: '測試 tag', aliases: [], nav_visible: true, sort_order: 10 },
      ],
      brands: [
        { id: 'brand-a', label: 'Brand A', description: '測試 brand', aliases: [], nav_visible: true, sort_order: 10 },
      ],
    })

    expect(reference_violations).toEqual([
      { content_type: 'guide', content_id: 'guide-with-brand-reference', field: 'tag_ids', value: 'brand-a' },
      { content_type: 'link', content_id: 'link-with-brand-reference', field: 'tag_ids', value: 'brand-a' },
    ])
  })

  it('should keep migrated content in the correct product, guide and link domains', () => {
    const product_entries = readContentProductEntries()
    const guide_entries = readContentGuideEntries()
    const link_entries = readContentLinkEntries()

    expect(product_entries).toHaveLength(62)
    expect(product_entries.map((entry) => entry.file_name)).toContain('2026-06-02-ikea充電線.json')
    expect(product_entries.map((entry) => entry.file_name)).toContain('2026-06-02-三菱重工冷氣.json')
    expect(product_entries.map((entry) => entry.file_name)).not.toContain('2026-06-02-日本米入門篇.json')
    expect(product_entries.map((entry) => entry.file_name)).not.toContain('2026-06-02-aeron-chair.json')
    expect(product_entries.map((entry) => entry.file_name)).not.toContain('2026-06-02-b18.json')
    expect(product_entries.map((entry) => entry.file_name)).not.toContain('2026-06-02-altwork-station.json')

    expect(guide_entries.map((entry) => entry.file_name)).toEqual([
      '2026-06-02-aeron-chair.json',
      '2026-06-02-日本米入門篇.json',
    ])
    expect(link_entries.map((entry) => entry.file_name)).toEqual([
      '2026-06-02-altwork-station.json',
      '2026-06-02-b18.json',
      'applepig-home.json',
    ])
  })

  it('should validate all migrated content domains against schemas and taxonomy references', () => {
    const product_entries = readContentProductEntries()
    const guide_entries = readContentGuideEntries()
    const link_entries = readContentLinkEntries()
    const channels = channel_taxonomy_schema.parse(readTaxonomy('channels.json')).items
    const categories = category_taxonomy_schema.parse(readTaxonomy('categories.json')).items
    const tags = tag_taxonomy_schema.parse(readTaxonomy('tags.json')).items
    const brands = brand_taxonomy_schema.parse(readTaxonomy('brands.json')).items

    for (const entry of product_entries) {
      expect(entry.content.id).toBe(entry.file_stem)
      expect(entry.content).not.toHaveProperty('category')
      expect(entry.content).not.toHaveProperty('tags')
      expect(() => product_schema.parse(entry.content)).not.toThrow()
    }
    for (const entry of guide_entries) {
      expect(entry.content.id).toBe(entry.file_stem)
      expect(entry.content).not.toHaveProperty('tags')
      expect(() => guide_schema.parse(entry.content)).not.toThrow()
    }
    for (const entry of link_entries) {
      expect(entry.content.id).toBe(entry.file_stem)
      expect(entry.content).not.toHaveProperty('tags')
      expect(() => link_schema.parse(entry.content)).not.toThrow()
    }

    expect(validateContentTaxonomyReferences({
      products: product_entries.map((entry) => entry.content),
      guides: guide_entries.map((entry) => entry.content),
      links: link_entries.map((entry) => entry.content),
      categories,
      tags,
      brands,
    })).toEqual([])
    expect(new Set(channels.map((channel) => channel.id)).has('other')).toBe(true)
  })

  it('should remove legacy platform and root category tags from migrated tag ids', () => {
    const content_entries = [
      ...readContentProductEntries(),
      ...readContentGuideEntries(),
      ...readContentLinkEntries(),
    ]
    const tag_ids = content_entries.flatMap((entry) => entry.content.tag_ids)

    expect(tag_ids).not.toEqual(expect.arrayContaining(LEGACY_PLATFORM_TAGS))
    expect(tag_ids).not.toEqual(expect.arrayContaining(LEGACY_ROOT_CATEGORY_TAGS))
    expect(readContentProductEntries().find((entry) => entry.file_stem === '2026-06-02-ikea充電線')?.content.tag_ids).toEqual([])
    expect(readContentProductEntries().find((entry) => entry.file_stem === '2026-06-02-三菱重工冷氣')?.content.tag_ids).toEqual([])
  })
})

function expectTaxonomyIdsToBeKebabCaseAndUnique(items: Array<{ id: string }>) {
  const ids = items.map((item) => item.id)

  expect(ids.every((id) => KEBAB_CASE_ASCII_PATTERN.test(id))).toBe(true)
  expect(new Set(ids).size).toBe(ids.length)
}

function expectSortOrderToBeAscending(items: Array<{ sort_order: number }>) {
  const sort_orders = items.map((item) => item.sort_order)

  expect(sort_orders).toEqual([...sort_orders].toSorted((left_order, right_order) => left_order - right_order))
}

function expectTaxonomyIdsNotToCollide(left_items: Array<{ id: string }>, right_items: Array<{ id: string }>) {
  const left_ids = new Set(left_items.map((item) => item.id))
  const collision_ids = right_items
    .map((item) => item.id)
    .filter((id) => left_ids.has(id))

  expect(collision_ids).toEqual([])
}
