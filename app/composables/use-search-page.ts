import { computed, ref, watch, type Ref } from 'vue'

import {
  appendSearchHistoryItem,
  clearSearchHistory,
  createLatestSearchRequestRunner,
  getClientSearchResults,
  getClientSearchSuggestions,
  getSearchPageMode,
  useSearchHistoryItems,
} from '../utils/search/client-search'
import type { SearchSuggestion } from '../utils/search/search-index'

export type UseSearchPageOptions = {
  submitted_search_query: Readonly<Ref<string>>
  initial_pending_search_query?: string
  navigateToSearch: (query: string | null) => void | Promise<void>
  is_client?: boolean
}

export function useSearchPage(options: UseSearchPageOptions) {
  const client_search_results = ref<SearchSuggestion[]>([])
  const suggestions = ref<SearchSuggestion[]>([])
  const history_items = useSearchHistoryItems()
  const is_search_loading = ref(false)
  const is_suggestion_loading = ref(false)
  const has_search_completed = ref(false)
  const search_error = ref<string | null>(null)
  const pending_search_query = ref(options.initial_pending_search_query ?? options.submitted_search_query.value)
  const submitted_search_query = computed(() => options.submitted_search_query.value)
  const search_mode = computed(() => getSearchPageMode({
    pending_query: pending_search_query.value,
    submitted_query: submitted_search_query.value,
  }))
  const search_request_runner = createLatestSearchRequestRunner<SearchSuggestion[]>()
  const suggestion_request_runner = createLatestSearchRequestRunner<SearchSuggestion[]>()

  watch(submitted_search_query, (query) => {
    if (pending_search_query.value !== query) {
      pending_search_query.value = query
    }
  }, { immediate: true })

  watch([pending_search_query, search_mode], async ([query, mode]) => {
    await loadSuggestions(query, mode)
  })

  watch(submitted_search_query, async (query) => {
    await loadSubmittedSearch(query)
  }, { immediate: true })

  async function loadSuggestions(query: string, mode: string) {
    const normalized_query = query.trim()

    if (mode !== 'suggesting' || normalized_query === '') {
      suggestions.value = []
      is_suggestion_loading.value = false
      return
    }

    if (!isClientSearchEnabled()) {
      suggestions.value = []
      return
    }

    is_suggestion_loading.value = true
    search_error.value = null

    try {
      const response = await suggestion_request_runner.run(normalized_query, () => getClientSearchSuggestions(normalized_query))

      if (response === null) {
        return
      }

      suggestions.value = response.value
    }
    catch {
      search_error.value = 'search-index-load-failed'
      suggestions.value = []
    }
    finally {
      is_suggestion_loading.value = false
    }
  }

  async function loadSubmittedSearch(query: string) {
    const normalized_query = query.trim()

    if (normalized_query === '') {
      client_search_results.value = []
      has_search_completed.value = false
      is_search_loading.value = false
      search_error.value = null
      return
    }

    if (!isClientSearchEnabled()) {
      client_search_results.value = []
      is_search_loading.value = true
      has_search_completed.value = false
      return
    }

    is_search_loading.value = true
    has_search_completed.value = false
    search_error.value = null
    saveSearchHistoryItem(normalized_query)

    try {
      const response = await search_request_runner.run(normalized_query, () => getClientSearchResults(normalized_query))

      if (response === null) {
        return
      }

      client_search_results.value = response.value
      has_search_completed.value = true
    }
    catch {
      client_search_results.value = []
      has_search_completed.value = true
      search_error.value = 'search-index-load-failed'
    }
    finally {
      is_search_loading.value = false
    }
  }

  async function retrySearch() {
    if (search_mode.value === 'suggesting') {
      await loadSuggestions(pending_search_query.value, search_mode.value)
      return
    }

    await loadSubmittedSearch(submitted_search_query.value)
  }

  function clearSubmittedSearch() {
    pending_search_query.value = ''
    void options.navigateToSearch(null)
  }

  function submitSearch(query: string) {
    const normalized_query = query.trim()
    pending_search_query.value = normalized_query

    if (normalized_query === '') {
      clearSubmittedSearch()
      return
    }

    saveSearchHistoryItem(normalized_query)
    void options.navigateToSearch(normalized_query)
  }

  function saveSearchHistoryItem(query: string) {
    history_items.value = appendSearchHistoryItem(query, history_items.value)
  }

  function clearSearchHistoryItems() {
    history_items.value = clearSearchHistory(null)
  }

  function isClientSearchEnabled() {
    return options.is_client ?? import.meta.client
  }

  return {
    pending_search_query,
    submitted_search_query,
    search_mode,
    suggestions,
    client_search_results,
    history_items,
    is_search_loading,
    is_suggestion_loading,
    has_search_completed,
    search_error,
    loadSubmittedSearch,
    retrySearch,
    clearSubmittedSearch,
    submitSearch,
    saveSearchHistoryItem,
    clearSearchHistoryItems,
  }
}
