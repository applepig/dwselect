import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchSuggestion } from '../app/utils/search/search-index'
import { useSearchPage } from '../app/composables/use-search-page'

const client_search_mock = vi.hoisted(() => ({
  appendSearchHistoryItem: vi.fn((query: string, history_items: string[]) => {
    const normalized_query = query.trim()

    if (normalized_query === '') {
      return history_items
    }

    return [
      normalized_query,
      ...history_items.filter((history_item) => history_item !== normalized_query),
    ]
  }),
  clearSearchHistory: vi.fn(() => []),
  getClientSearchResults: vi.fn(),
  getClientSearchSuggestions: vi.fn(),
  history_items: undefined as ReturnType<typeof ref<string[]>> | undefined,
}))

vi.mock('../app/utils/search/client-search', () => ({
  appendSearchHistoryItem: client_search_mock.appendSearchHistoryItem,
  clearSearchHistory: client_search_mock.clearSearchHistory,
  createLatestSearchRequestRunner: vi.fn(() => ({
    run: vi.fn(async (query: string, load_value: () => Promise<SearchSuggestion[]>) => ({
      query,
      value: await load_value(),
    })),
  })),
  getClientSearchResults: client_search_mock.getClientSearchResults,
  getClientSearchSuggestions: client_search_mock.getClientSearchSuggestions,
  getSearchPageMode: (input: { pending_query: string, submitted_query: string }) => {
    const pending_query = input.pending_query.trim()
    const submitted_query = input.submitted_query.trim()

    if (submitted_query !== '' && pending_query === submitted_query) {
      return 'searching'
    }

    if (pending_query !== '') {
      return 'suggesting'
    }

    return 'idle'
  },
  useSearchHistoryItems: () => client_search_mock.history_items ?? ref<string[]>([]),
}))

const product_suggestion: SearchSuggestion = {
  document_id: 'product:sharp-keyboard',
  content_id: 'sharp-keyboard',
  type: 'product',
  label: 'Sharp',
  title: 'Sharp 鍵盤',
  summary: '搜尋建議摘要',
  href: '/products/sharp-keyboard',
  external: false,
  category_labels: ['電腦'],
  channel_id: 'pchome',
  channel_label: 'PChome',
  price_text: 'NT$ 1,990',
  image_url: '/products/images/sharp-keyboard.jpg',
}

beforeEach(() => {
  client_search_mock.appendSearchHistoryItem.mockClear()
  client_search_mock.clearSearchHistory.mockClear()
  client_search_mock.getClientSearchResults.mockReset()
  client_search_mock.getClientSearchSuggestions.mockReset()
  client_search_mock.history_items = ref<string[]>([])
})

describe('useSearchPage', () => {
  it('should transition from idle to suggesting and then searching after submitting a query', async () => {
    const submitted_search_query = ref('')
    const navigateToSearch = vi.fn((query: string | null) => {
      submitted_search_query.value = query ?? ''
    })
    client_search_mock.getClientSearchSuggestions.mockResolvedValue([product_suggestion])
    client_search_mock.getClientSearchResults.mockResolvedValue([product_suggestion])
    const search_page = useSearchPage({
      submitted_search_query,
      navigateToSearch,
      is_client: true,
    })

    await flushReactiveSearch()
    expect(search_page.search_mode.value).toBe('idle')

    search_page.pending_search_query.value = 'Sharp'
    await flushReactiveSearch()

    expect(search_page.search_mode.value).toBe('suggesting')
    expect(search_page.suggestions.value).toEqual([product_suggestion])
    expect(client_search_mock.getClientSearchSuggestions).toHaveBeenCalledWith('Sharp')

    search_page.submitSearch('Sharp')
    await flushReactiveSearch()

    expect(navigateToSearch).toHaveBeenCalledWith('Sharp')
    expect(search_page.search_mode.value).toBe('searching')
    expect(search_page.client_search_results.value).toEqual([product_suggestion])
    expect(search_page.has_search_completed.value).toBe(true)
    expect(client_search_mock.getClientSearchResults).toHaveBeenCalledWith('Sharp')
  })

  it('should recover from a suggestion loading error when retrying', async () => {
    const submitted_search_query = ref('')
    client_search_mock.getClientSearchSuggestions
      .mockRejectedValueOnce(new Error('search index failed'))
      .mockResolvedValueOnce([product_suggestion])
    const search_page = useSearchPage({
      submitted_search_query,
      navigateToSearch: vi.fn(),
      is_client: true,
    })

    search_page.pending_search_query.value = 'Sharp'
    await flushReactiveSearch()

    expect(search_page.search_error.value).toBe('search-index-load-failed')
    expect(search_page.suggestions.value).toEqual([])

    await search_page.retrySearch()
    await flushReactiveSearch()

    expect(search_page.search_error.value).toBeNull()
    expect(search_page.suggestions.value).toEqual([product_suggestion])
  })

  it('should clear submitted search state and remove history when requested', async () => {
    const submitted_search_query = ref('Sharp')
    const navigateToSearch = vi.fn((query: string | null) => {
      submitted_search_query.value = query ?? ''
    })
    client_search_mock.getClientSearchResults.mockResolvedValue([product_suggestion])
    client_search_mock.history_items = ref(['Sharp'])
    const search_page = useSearchPage({
      submitted_search_query,
      initial_pending_search_query: 'Sharp',
      navigateToSearch,
      is_client: true,
    })

    await flushReactiveSearch()
    expect(search_page.client_search_results.value).toEqual([product_suggestion])

    search_page.clearSubmittedSearch()
    await flushReactiveSearch()

    expect(navigateToSearch).toHaveBeenCalledWith(null)
    expect(search_page.pending_search_query.value).toBe('')
    expect(search_page.client_search_results.value).toEqual([])
    expect(search_page.has_search_completed.value).toBe(false)

    search_page.clearSearchHistoryItems()

    expect(client_search_mock.clearSearchHistory).toHaveBeenCalledWith(null)
    expect(search_page.history_items.value).toEqual([])
  })

  it('should write search history on submit but not while only loading suggestions', async () => {
    const submitted_search_query = ref('')
    const navigateToSearch = vi.fn()
    client_search_mock.getClientSearchSuggestions.mockResolvedValue([product_suggestion])
    const search_page = useSearchPage({
      submitted_search_query,
      navigateToSearch,
      is_client: true,
    })

    search_page.pending_search_query.value = 'Sharp'
    await flushReactiveSearch()

    expect(search_page.history_items.value).toEqual([])
    expect(client_search_mock.appendSearchHistoryItem).not.toHaveBeenCalled()

    search_page.submitSearch(' Sharp ')

    expect(search_page.history_items.value).toEqual(['Sharp'])
    expect(client_search_mock.appendSearchHistoryItem).toHaveBeenCalledWith('Sharp', [])
    expect(navigateToSearch).toHaveBeenCalledWith('Sharp')
  })

  it('should keep submitted searches in loading state during SSR', async () => {
    const search_page = useSearchPage({
      submitted_search_query: ref('Sharp'),
      navigateToSearch: vi.fn(),
      is_client: false,
    })

    await flushReactiveSearch()

    expect(search_page.search_mode.value).toBe('searching')
    expect(search_page.is_search_loading.value).toBe(true)
    expect(search_page.has_search_completed.value).toBe(false)
    expect(search_page.client_search_results.value).toEqual([])
    expect(client_search_mock.getClientSearchResults).not.toHaveBeenCalled()
  })
})

async function flushReactiveSearch() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}
