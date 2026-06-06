import type MiniSearch from 'minisearch'

import type { SearchDocument, SearchIndexPayload, SearchSuggestion } from './search-index'
import { loadSearchIndex, querySearchIndex } from './search-index'

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
