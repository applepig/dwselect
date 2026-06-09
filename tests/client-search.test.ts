import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Product } from '../app/utils/product-schema'
import { buildSearchIndexPayload } from '../app/utils/search/search-index'

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
    tag_ids: ['keyboard', 'usb-c'],
  reference_url: 'https://example.com/reference',
  created_at: '2026-06-02T00:00:00+08:00',
  updated_at: '2026-06-02T00:00:00+08:00',
  published_at: '2026-06-02T00:00:00+08:00',
  unpublished_at: null,
  archived_at: null,
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('client search lazy loader', () => {
  it('should fetch the static MiniSearch index and return complete client search results', async () => {
    const payload = buildSearchIndexPayload({ products: [base_product], guides: [], links: [] }, { generated_at: '2026-06-06T00:00:00+08:00' })
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
        image_url: 'https://example.com/product.jpg',
        channel_id: 'pchome',
        channel_label: 'PChome',
      }),
    ])
  })

  it('should retry fetching the search index after a failed request', async () => {
    const payload = buildSearchIndexPayload({ products: [base_product], guides: [], links: [] }, { generated_at: '2026-06-06T00:00:00+08:00' })
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
    const payload = buildSearchIndexPayload({ products, guides: [], links: [] }, { generated_at: '2026-06-06T00:00:00+08:00' })
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
})
