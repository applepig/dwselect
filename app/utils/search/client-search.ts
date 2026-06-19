import { useStorage } from '@vueuse/core'
import type MiniSearch from 'minisearch'
import { ref } from 'vue'

import type { SearchDocument, SearchIndexPayload, SearchSuggestion } from './search-index'
import { loadSearchIndex, querySearchIndex } from './search-index'

export const SEARCH_HISTORY_STORAGE_KEY = 'dwselect.search.history.v1'
const SEARCH_HISTORY_LIMIT = 12

export type SearchPageMode = 'idle' | 'suggesting' | 'searching'

export type SearchPageModeInput = {
  pending_query: string
  submitted_query: string
}

export type SearchHistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

let search_index_promise: Promise<MiniSearch<SearchDocument>> | null = null

export async function loadClientSearchIndex() {
  search_index_promise ??= fetch('/search-index.json')
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Search index request failed: ${response.status}`)
      }

      return await response.json() as SearchIndexPayload
    })
    .then((payload) => loadSearchIndex(payload))

  try {
    return await search_index_promise
  }
  catch (error) {
    search_index_promise = null
    throw error
  }
}

export function resetClientSearchIndex() {
  search_index_promise = null
}

export async function getClientSearchResults(query: string): Promise<SearchSuggestion[]> {
  if (query.trim() === '') {
    return []
  }

  const search_index = await loadClientSearchIndex()

  return querySearchIndex(search_index, query)
}

export async function getClientSearchSuggestions(query: string, limit = 12): Promise<SearchSuggestion[]> {
  return (await getClientSearchResults(query)).slice(0, limit)
}

export function getSearchPageMode(input: SearchPageModeInput): SearchPageMode {
  const pending_query = input.pending_query.trim()
  const submitted_query = input.submitted_query.trim()

  if (submitted_query !== '' && pending_query === submitted_query) {
    return 'searching'
  }

  if (pending_query !== '') {
    return 'suggesting'
  }

  return 'idle'
}

export function readSearchHistory(storage: SearchHistoryStorage | null | undefined): string[] {
  if (storage === null || storage === undefined) {
    return []
  }

  try {
    const raw_history = storage.getItem(SEARCH_HISTORY_STORAGE_KEY)

    if (raw_history === null) {
      return []
    }

    return parseSearchHistory(raw_history)
  }
  catch {
    return []
  }
}

export function useSearchHistoryItems() {
  const storage = getSafeBrowserLocalStorage()

  if (storage === null) {
    return ref<string[]>([])
  }

  return useStorage<string[]>(SEARCH_HISTORY_STORAGE_KEY, [], storage, {
    serializer: {
      read: parseSearchHistory,
      write: (value) => JSON.stringify(normalizeSearchHistory(value)),
    },
    writeDefaults: false,
    initOnMounted: true,
    onError: () => {},
  })
}

export function appendSearchHistoryItem(query: string, history_items: string[]): string[] {
  const normalized_query = query.trim()

  if (normalized_query === '') {
    return normalizeSearchHistory(history_items)
  }

  return [
    normalized_query,
    ...normalizeSearchHistory(history_items).filter((item) => item !== normalized_query),
  ].slice(0, SEARCH_HISTORY_LIMIT)
}

export function saveSearchHistoryItem(
  query: string,
  storage: SearchHistoryStorage | null | undefined,
): string[] {
  const normalized_query = query.trim()

  if (normalized_query === '') {
    return readSearchHistory(storage)
  }

  const next_history = appendSearchHistoryItem(normalized_query, readSearchHistory(storage))

  try {
    storage?.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next_history))
  }
  catch {
    return []
  }

  return next_history
}

export function clearSearchHistory(storage: SearchHistoryStorage | null | undefined): string[] {
  try {
    storage?.removeItem(SEARCH_HISTORY_STORAGE_KEY)
  }
  catch {
    return []
  }

  return []
}

export function clearStoredSearchHistory(): string[] {
  return clearSearchHistory(getSafeBrowserLocalStorage())
}

export function createLatestSearchRequestRunner<T>() {
  let latest_request_id = 0

  return {
    async run(query: string, load_value: () => Promise<T>): Promise<{ query: string, value: T } | null> {
      const request_id = latest_request_id + 1
      latest_request_id = request_id

      try {
        const value = await load_value()

        if (request_id !== latest_request_id) {
          return null
        }

        return { query, value }
      }
      catch (error) {
        if (request_id !== latest_request_id) {
          return null
        }

        throw error
      }
    },
  }
}

function parseSearchHistory(raw_history: string): string[] {
  try {
    return normalizeSearchHistory(JSON.parse(raw_history))
  }
  catch {
    return []
  }
}

function normalizeSearchHistory(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .slice(0, SEARCH_HISTORY_LIMIT)
}

export function getSafeBrowserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  }
  catch {
    return null
  }
}
