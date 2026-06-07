import MiniSearch from 'minisearch'
import { readFileSync, readdirSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Product } from '../app/utils/product-schema'
import { buildSearchIndexFile } from '../scripts/build-search-index'
import {
  SEARCH_INDEX_VERSION,
  buildSearchIndexPayload,
  getSearchOptions,
  getSearchDocuments,
  loadSearchIndex,
  querySearchIndex,
} from '../app/utils/search/search-index'

const base_product: Product = {
  id: '2026-06-02-sample-product',
  status: 'published',
  name: '機械鍵盤',
  price_text: 'NT$ 1,990',
  price: {
    amount: 1990,
    currency: 'TWD',
    unit: 'each',
    label: null,
  },
  summary: '熱插拔小尺寸鍵盤',
  description: '適合長時間寫程式的繁中鍵盤',
  purchase_url: 'https://example.com/product',
  image_url: 'https://example.com/product.jpg',
  channel_id: 'pchome',
  category_id: 'computer',
  tags: ['鍵盤', 'USB-C'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}
const products_dir_url = new URL('../content/products/', import.meta.url)
const search_index_url = new URL('../public/search-index.json', import.meta.url)

const temp_paths: string[] = []

afterEach(async () => {
  vi.unstubAllGlobals()

  await Promise.all(temp_paths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

function readContentProducts(): Product[] {
  return readdirSync(products_dir_url)
    .filter((file_name) => file_name.endsWith('.json'))
    .toSorted((left_file_name, right_file_name) => left_file_name.localeCompare(right_file_name))
    .map((file_name) => JSON.parse(readFileSync(new URL(file_name, products_dir_url), 'utf8')) as Product)
}

function readStaticSearchIndexPayload() {
  return JSON.parse(readFileSync(search_index_url, 'utf8')) as ReturnType<typeof buildSearchIndexPayload>
}

describe('search index', () => {
  it('should map published products to search documents', () => {
    expect(getSearchDocuments([base_product])).toEqual([
      {
        id: '2026-06-02-sample-product',
        name: '機械鍵盤',
        summary: '熱插拔小尺寸鍵盤',
        description: '適合長時間寫程式的繁中鍵盤',
        category_id: 'computer',
        category_label: '電腦',
        channel_id: 'pchome',
        channel_label: 'PChome',
        tags: ['鍵盤', 'USB-C'],
        price_text: 'NT$ 1,990',
        image_url: 'https://example.com/product.jpg',
        published_at: '2026-06-02T00:00:00+08:00',
      },
    ])
  })

  it('should map the fallback other category to the taxonomy label for search documents', () => {
    expect(getSearchDocuments([{
      ...base_product,
      id: 'other-category-product',
      category_id: 'other',
    }])).toEqual([
      expect.objectContaining({
        id: 'other-category-product',
        category_id: 'other',
        category_label: '其他',
      }),
    ])
  })

  it('should exclude draft, unpublished and archived products from documents and index', () => {
    const products = [
      base_product,
      { ...base_product, id: 'draft-product', status: 'draft' as const, name: '草稿商品' },
      { ...base_product, id: 'unpublished-product', status: 'unpublished' as const, name: '下架商品' },
      { ...base_product, id: 'archived-product', status: 'archived' as const, name: '封存商品' },
    ]

    const payload = buildSearchIndexPayload(products, { generated_at: '2026-06-06T00:00:00+08:00' })
    const mini_search = MiniSearch.loadJSON(JSON.stringify(payload.index), {
      ...getSearchOptions(),
    })

    expect(payload.documents.map((document) => document.id)).toEqual(['2026-06-02-sample-product'])
    expect(mini_search.search('草稿商品')).toEqual([])
    expect(mini_search.search('下架商品')).toEqual([])
    expect(mini_search.search('封存商品')).toEqual([])
  })

  it('should build the static JSON contract and restore it with MiniSearch.loadJSON', () => {
    const payload = buildSearchIndexPayload([base_product], { generated_at: '2026-06-06T00:00:00+08:00' })
    const mini_search = loadSearchIndex(payload)

    expect(payload).toMatchObject({
      version: SEARCH_INDEX_VERSION,
      generated_at: '2026-06-06T00:00:00+08:00',
      documents: [
        {
          id: '2026-06-02-sample-product',
          name: '機械鍵盤',
          category_label: '電腦',
          channel_label: 'PChome',
          price_text: 'NT$ 1,990',
          image_url: 'https://example.com/product.jpg',
        },
      ],
    })
    expect(payload.index).toEqual(expect.objectContaining({ documentCount: 1 }))
    expect(mini_search.search('鍵盤')).toHaveLength(1)
    expect(mini_search.search('熱插拔')).toHaveLength(1)
    expect(mini_search.search('電腦')).toHaveLength(1)
    expect(mini_search.search('PChome')).toHaveLength(1)
  })

  it('should query restored index and return UI suggestions', () => {
    const second_product = {
      ...base_product,
      id: '2026-06-03-mouse',
      name: '人體工學滑鼠',
      summary: '垂直握感',
      description: '長時間工作使用',
      tags: ['滑鼠'],
      price_text: 'NT$ 990',
      image_url: 'https://example.com/mouse.jpg',
      published_at: '2026-06-03T00:00:00+08:00',
    }
    const payload = buildSearchIndexPayload([base_product, second_product], {
      generated_at: '2026-06-06T00:00:00+08:00',
    })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, '繁中鍵盤')).toEqual([
      {
        id: '2026-06-02-sample-product',
        label: '機械鍵盤',
        category: '電腦',
        category_label: '電腦',
        channel: 'PChome',
        channel_label: 'PChome',
        price_text: 'NT$ 1,990',
        score: expect.any(Number),
      },
    ])
    expect(querySearchIndex(mini_search, '   ')).toEqual([])
  })

  it('should return complete search results while allowing autocomplete to limit the first 12 suggestions', () => {
    const products = Array.from({ length: 13 }, (_, index) => ({
      ...base_product,
      id: `shared-product-${index + 1}`,
      name: index === 12 ? 'Lower Relevance Product' : `Shared Token Product ${index + 1}`,
      tags: ['shared-token'],
      published_at: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00+08:00`,
    }))
    const payload = buildSearchIndexPayload(products, { generated_at: '2026-06-06T00:00:00+08:00' })
    const mini_search = loadSearchIndex(payload)

    const complete_results = querySearchIndex(mini_search, 'shared-token')
    const autocomplete_results = querySearchIndex(mini_search, 'shared-token', 12)

    expect(complete_results).toHaveLength(13)
    expect(complete_results.map((result) => result.id)).toContain('shared-product-13')
    expect(autocomplete_results).toHaveLength(12)
    expect(autocomplete_results.map((result) => result.id)).not.toContain('shared-product-13')
  })

  it('should use the product filename stem as the build output document id', async () => {
    const temp_dir = await mkdtemp(join(tmpdir(), 'dwselect-search-index-'))
    temp_paths.push(temp_dir)
    const products_dir = join(temp_dir, 'products')
    const output_path = join(temp_dir, 'public', 'search-index.json')
    await mkdir(products_dir)
    await writeFile(join(products_dir, '2026-06-07-filename-stem.json'), JSON.stringify({
      id: 'internal-json-id',
      status: 'published',
      name: '檔名商品',
      price_text: 'NT$ 1,990',
      price: {
        amount: 1990,
        currency: 'TWD',
        unit: 'each',
        label: null,
      },
      summary: '適合長時間寫程式的繁中鍵盤',
      description: '適合長時間寫程式的繁中鍵盤',
      purchase_url: 'https://example.com/product',
      image_url: 'https://example.com/product.jpg',
      channel_id: 'other',
      category_id: 'computer',
      tags: ['鍵盤', 'USB-C'],
      reference_url: 'https://example.com/reference',
      created_at: '2026-06-02T00:00:00+08:00',
      updated_at: '2026-06-02T00:00:00+08:00',
      published_at: '2026-06-02T00:00:00+08:00',
      unpublished_at: null,
      archived_at: null,
    }))

    await buildSearchIndexFile(products_dir, output_path)

    const payload = JSON.parse(await readFile(output_path, 'utf8')) as ReturnType<typeof buildSearchIndexPayload>
    const mini_search = loadSearchIndex(payload)

    expect(payload.documents).toEqual([
      expect.objectContaining({ id: '2026-06-07-filename-stem', name: '檔名商品' }),
    ])
    expect(querySearchIndex(mini_search, '檔名商品')).toEqual([
      expect.objectContaining({
        id: '2026-06-07-filename-stem',
        category: '電腦',
        category_label: '電腦',
        channel: '其他通路',
        channel_label: '其他通路',
      }),
    ])
  })

  it('should allow a fallback-tokenized query to search an index built with Intl.Segmenter tokens', () => {
    class Segmenter {
      segment() {
        return [
          { segment: '機械', isWordLike: true },
          { segment: '鍵盤', isWordLike: true },
        ]
      }
    }

    vi.stubGlobal('Intl', { ...Intl, Segmenter })
    const payload = buildSearchIndexPayload([base_product], { generated_at: '2026-06-06T00:00:00+08:00' })
    vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined })
    const mini_search = loadSearchIndex(payload)

    expect(querySearchIndex(mini_search, '機械鍵盤')).toEqual([
      expect.objectContaining({ id: '2026-06-02-sample-product' }),
    ])
  })

  it('should keep the generated static search index document count aligned with cutover content', () => {
    const published_count = readContentProducts().filter((product) => product.status === 'published').length
    const payload = readStaticSearchIndexPayload()

    expect(published_count).toBe(66)
    expect(payload.documents).toHaveLength(published_count)
    expect(payload.index.documentCount).toBe(published_count)
    expect(payload.documents.map((document) => document.id)).not.toContain('2026-06-02-sample-product')
    expect(payload.documents).toContainEqual(expect.objectContaining({
      id: '2026-06-02-sharp-65吋-xled',
      name: 'Sharp 65吋 XLED',
      category_label: '影音',
      channel_label: expect.any(String),
    }))
  })

  it('should query real product names, summaries, descriptions, category labels, channel labels and tags from the generated static search index', () => {
    const mini_search = loadSearchIndex(readStaticSearchIndexPayload())

    expect(querySearchIndex(mini_search, 'Sharp 65吋 XLED')).toContainEqual(expect.objectContaining({
      id: '2026-06-02-sharp-65吋-xled',
      label: 'Sharp 65吋 XLED',
      category: '影音',
      category_label: '影音',
    }))
    expect(querySearchIndex(mini_search, '如果不想買OLED').length).toBeGreaterThan(0)
    expect(querySearchIndex(mini_search, 'Sharp XLED應該是最好的選擇').length).toBeGreaterThan(0)
    expect(querySearchIndex(mini_search, '影音').length).toBeGreaterThan(0)
    expect(querySearchIndex(mini_search, 'PCHome').length).toBeGreaterThan(0)
  })
})
