import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CategoryDefinition, ChannelDefinition, Product, TagDefinition } from '../app/utils/product-schema'
import { buildSearchIndexPayload } from '../app/utils/search/search-index'
import {
  createLatestSearchRequestRunner,
  getSafeBrowserLocalStorage,
  getSearchPageMode,
  readSearchHistory,
  saveSearchHistoryItem,
  SEARCH_HISTORY_STORAGE_KEY,
} from '../app/utils/search/client-search'

const base_product: Product = {
  id: '2026-06-02-sample-product',
  status: 'published',
  name: '機械鍵盤',
  english_name: 'Mechanical Keyboard',
  summary: '熱插拔小尺寸鍵盤',
  long_description: '適合長時間寫程式的繁中鍵盤',
  llm_description: '',
  search_aliases: [],
  model_numbers: [],
  offers: [
    {
      channel_id: 'pchome',
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
  image_file: '2026-06-02-sample-product.jpg',
  image_url: null,
  category_id: 'computer',
  tag_ids: ['keyboard', 'usb-c'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

const test_taxonomies: {
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags: TagDefinition[]
  brands: TagDefinition[]
} = {
  categories: [
    { id: 'computer', label: '電腦', short_label: '電腦', nav_visible: true, sort_order: 30 },
  ],
  channels: [
    { id: 'pchome', label: 'PChome', tint: 'blue', host_patterns: ['24h.pchome.com.tw'], sort_order: 10 },
  ],
  tags: [
    { id: 'keyboard', label: '鍵盤', description: '鍵盤', aliases: [], nav_visible: true, sort_order: 10 },
    { id: 'usb-c', label: 'USB-C', description: 'USB-C', aliases: [], nav_visible: true, sort_order: 20 },
    { id: 'shared-token', label: 'shared-token', description: 'shared-token', aliases: [], nav_visible: true, sort_order: 30 },
  ],
  brands: [],
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('client search lazy loader', () => {
  it('should fetch the static MiniSearch index and return complete client search results', async () => {
    const payload = buildSearchIndexPayload({ products: [base_product], guides: [], links: [] }, { ...test_taxonomies, generated_at: '2026-06-06T00:00:00+08:00' })
    const fetch_mock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload })
    vi.stubGlobal('fetch', fetch_mock)
    const { getClientSearchResults } = await import('../app/utils/search/client-search')

    const results = await getClientSearchResults('繁中鍵盤')

    expect(fetch_mock).toHaveBeenCalledWith('/search-index.json')
    expect(results).toEqual([
      expect.objectContaining({
        document_id: 'product:2026-06-02-sample-product',
        content_id: '2026-06-02-sample-product',
        type: 'product',
        title: '機械鍵盤',
        href: '/products/2026-06-02-sample-product',
        external: false,
        price_text: 'NT$ 1,990',
        image_url: '/images/products/2026-06-02-sample-product.webp',
        channel_id: 'pchome',
        channel_label: 'PChome',
      }),
    ])
  })

  it('should retry fetching the search index after a failed request', async () => {
    const payload = buildSearchIndexPayload({ products: [base_product], guides: [], links: [] }, { ...test_taxonomies, generated_at: '2026-06-06T00:00:00+08:00' })
    const fetch_mock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => payload })
    vi.stubGlobal('fetch', fetch_mock)
    const { loadClientSearchIndex } = await import('../app/utils/search/client-search')

    await expect(loadClientSearchIndex()).rejects.toThrow('Search index request failed: 503')
    await expect(loadClientSearchIndex()).resolves.toBeDefined()

    expect(fetch_mock).toHaveBeenCalledTimes(2)
  })

  it('should limit autocomplete suggestions to the first 12 matched results by default', async () => {
    const products = Array.from({ length: 13 }, (_, index) => ({
      ...base_product,
      id: `shared-product-${index + 1}`,
      name: index === 12 ? 'Lower Relevance Product' : `Shared Token Product ${index + 1}`,
      tag_ids: ['shared-token'],
      published_at: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00+08:00`,
    }))
    const payload = buildSearchIndexPayload({ products, guides: [], links: [] }, { ...test_taxonomies, generated_at: '2026-06-06T00:00:00+08:00' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }))
    const { getClientSearchSuggestions } = await import('../app/utils/search/client-search')

    const suggestions = await getClientSearchSuggestions('shared-token')

    expect(suggestions).toHaveLength(12)
    expect(suggestions.map((suggestion) => suggestion.document_id)).not.toContain('product:shared-product-13')
    expect(suggestions[0]).toEqual(expect.objectContaining({
      category_labels: ['電腦'],
      channel_label: 'PChome',
    }))
  })

  it('should keep the latest autocomplete request from being overwritten by a stale response', async () => {
    const request_runner = createLatestSearchRequestRunner<string[]>()
    const slow_request = request_runner.run('keyboard', async () => ['舊建議'])
    const fast_request = request_runner.run('keyboard case', async () => ['新建議'])

    await expect(fast_request).resolves.toEqual({ query: 'keyboard case', value: ['新建議'] })
    await expect(slow_request).resolves.toBeNull()
  })

  it('should derive idle mode from empty submitted and pending queries', () => {
    expect(getSearchPageMode({ pending_query: '   ', submitted_query: '' })).toBe('idle')
    expect(getSearchPageMode({ pending_query: ' 鍵盤 ', submitted_query: '' })).toBe('suggesting')
    expect(getSearchPageMode({ pending_query: '滑鼠', submitted_query: '滑鼠' })).toBe('searching')
  })

  it('should serialize search history with exact dedupe, latest first and a 12 item limit', () => {
    const storage = new Map<string, string>()

    for (const query of ['Sharp', '咖啡', '機械鍵盤', '耳機', '螢幕', '椅子', '日本米', '收納', '喇叭', '滑鼠', '螢幕架', '桌燈', 'Sharp']) {
      saveSearchHistoryItem(query, {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      })
    }

    expect(JSON.parse(storage.get(SEARCH_HISTORY_STORAGE_KEY) ?? '[]')).toEqual([
      'Sharp',
      '桌燈',
      '螢幕架',
      '滑鼠',
      '喇叭',
      '收納',
      '日本米',
      '椅子',
      '螢幕',
      '耳機',
      '機械鍵盤',
      '咖啡',
    ])
  })

  it('should trim parsed history and cap persisted values to 12 items', () => {
    const stored_history = JSON.stringify([
      '  Sharp  ',
      '咖啡',
      '',
      '機械鍵盤',
      '耳機',
      '螢幕',
      '椅子',
      '日本米',
      '收納',
      '喇叭',
      '滑鼠',
      '螢幕架',
      '桌燈',
      '多出的第十三筆',
    ])

    expect(readSearchHistory({
      getItem: () => stored_history,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })).toEqual([
      'Sharp',
      '咖啡',
      '機械鍵盤',
      '耳機',
      '螢幕',
      '椅子',
      '日本米',
      '收納',
      '喇叭',
      '滑鼠',
      '螢幕架',
      '桌燈',
    ])
  })

  it('should fallback to empty history when localStorage is unavailable or corrupted', () => {
    expect(readSearchHistory({
      getItem: () => '{broken-json',
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })).toEqual([])

    expect(saveSearchHistoryItem('鍵盤', {
      getItem: () => {
        throw new Error('localStorage unavailable')
      },
      setItem: () => {
        throw new Error('localStorage unavailable')
      },
      removeItem: vi.fn(),
    })).toEqual([])
  })

  it('should return null when the browser localStorage getter throws', () => {
    const blocked_window = Object.create(null, {
      localStorage: {
        configurable: true,
        get() {
          throw new Error('localStorage blocked')
        },
      },
    })
    vi.stubGlobal('window', blocked_window)

    expect(getSafeBrowserLocalStorage()).toBeNull()
  })
})
