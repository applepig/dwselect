<template>
  <section
    class="compact-panel"
    aria-label="搜尋"
  >
    <div class="section-heading-row">
      <div>
        <p class="section-kicker">
          Search
        </p>
        <h2 class="section-title">
          搜看看
        </h2>
      </div>
    </div>

    <div class="search-input-shell">
      <UIcon
        name="i-lucide-search"
        class="search-input-icon"
        aria-hidden="true"
      />
      <input
        ref="search_input"
        v-model="pending_search_query"
        class="search-input"
        type="text"
        placeholder="在找什麼嗎？™"
        autocomplete="off"
        :disabled="!is_search_input_ready"
        @keydown.enter="submitPendingSearchFromEvent"
      >
    </div>

    <div
      v-if="search_error !== null"
      class="search-error-panel"
      role="alert"
    >
      <p class="empty-title">
        搜尋索引暫時載入失敗
      </p>
      <p class="search-helper-text">
        請重新嘗試，或清空搜尋回到搜尋紀錄。
      </p>
      <div class="search-action-row">
        <button
          type="button"
          class="search-action-button"
          @click="retrySearch"
        >
          重新嘗試
        </button>
        <button
          type="button"
          class="search-action-button"
          @click="clearSubmittedSearch"
        >
          清空搜尋
        </button>
      </div>
    </div>

    <div
      v-else-if="search_mode === 'idle' && history_items.length > 0"
      class="search-empty-panel search-history-panel"
    >
      <div class="search-panel-heading">
        <p class="empty-title">
          搜尋紀錄
        </p>
        <button
          type="button"
          class="search-clear-button"
          @click="onClearHistoryClicked"
        >
          清除紀錄
        </button>
      </div>
      <div class="search-history-list">
        <button
          v-for="history_item in history_items"
          :key="`search-history-${history_item}`"
          type="button"
          class="search-history-item"
          @click="submitSearch(history_item)"
        >
          {{ history_item }}
        </button>
      </div>
    </div>

    <div
      v-else-if="search_mode === 'idle'"
      class="search-empty-panel search-popular-panel"
    >
      <p class="empty-title">
        熱門 tag
      </p>
      <div class="tag-chip-list">
        <NuxtLink
          v-for="tag in compact_all_tags"
          :key="`search-tag-${tag.label}`"
          :to="{ path: '/search', query: { q: tag.label } }"
          class="tag-chip"
          @click="onPopularTagClicked(tag.label)"
        >
          <span>{{ tag.label }}</span>
          <span class="tag-count">{{ tag.count }}</span>
        </NuxtLink>
      </div>
      <p
        v-if="compact_all_tags.length === 0"
        class="search-helper-text"
      >
        目前還沒有搜尋紀錄。
      </p>
    </div>

    <div
      v-else-if="search_mode === 'suggesting'"
      class="search-empty-panel search-suggestion-panel"
    >
      <p class="empty-title">
        建議
      </p>
      <div
        v-if="suggestions.length > 0"
        class="search-suggestion-list"
      >
        <button
          v-for="suggestion in suggestions"
          :key="suggestion.document_id"
          type="button"
          class="search-suggestion-item"
          @click="onSuggestionClicked(suggestion)"
        >
          <span class="search-suggestion-type">{{ getResultTypeLabel(suggestion.type) }}</span>
          <span class="search-suggestion-title">{{ suggestion.title }}</span>
          <span class="search-suggestion-summary">{{ suggestion.summary }}</span>
        </button>
      </div>
      <p
        v-else-if="is_suggestion_loading"
        class="search-helper-text"
      >
        載入建議中
      </p>
      <p
        v-else
        class="search-helper-text"
      >
        沒有建議，按 Enter 搜尋。
      </p>
    </div>

    <div
      v-else-if="search_empty_reason === 'no-results'"
      class="compact-empty-state"
    >
      <p class="empty-title">
        沒這個坑，去許願吧
      </p>
    </div>

    <div
      v-else-if="search_mode === 'searching' && is_search_loading"
      class="compact-empty-state"
    >
      <p class="empty-title">
        搜尋中
      </p>
    </div>

    <div
      v-else-if="search_mode === 'searching'"
      class="search-results"
    >
      <section
        v-for="section in search_result_sections"
        :key="section.id"
        class="search-result-section"
        :data-section-id="section.id"
      >
        <h3 class="search-result-section-heading">
          {{ section.label }} {{ section.rows.length }}
        </h3>
        <ResourceList
          :rows="section.rows"
          :aria_label="`${section.label}搜尋結果`"
        />
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getSearchResultSections, getTagChips } from '../utils/published-products'
import type { SearchSuggestion } from '../utils/search/search-index'
import {
  clearSearchHistory,
  appendSearchHistoryItem,
  createLatestSearchRequestRunner,
  getClientSearchResults,
  getClientSearchSuggestions,
  getSearchPageMode,
  useSearchHistoryItems,
} from '../utils/search/client-search'

const route = useRoute()
const router = useRouter()
const { all_products, runtime_taxonomies, runtime_guides, runtime_links } = await useCatalogData()
const client_search_results = ref<SearchSuggestion[]>([])
const suggestions = ref<SearchSuggestion[]>([])
const history_items = useSearchHistoryItems()
const is_search_loading = ref(false)
const is_suggestion_loading = ref(false)
const is_search_input_ready = ref(false)
const has_search_completed = ref(false)
const search_error = ref<string | null>(null)
const search_input = ref<HTMLInputElement | null>(null)
const route_state = computed(() => ({
  ...getCompactAppStateFromRoute({ path: route.path, query: route.query }),
  search_result_ids: client_search_results.value
    ?.filter((result) => result.type === 'product')
    .map((result) => result.content_id) ?? null,
}))
const compact_all_tags = computed(() => getTagChips(
  {
    products: all_products.value,
    guides: runtime_guides.value ?? [],
    links: runtime_links.value ?? [],
  },
  [],
  runtime_taxonomies.value ?? {
    categories: [],
    channels: [],
    tags: [],
  },
  Number.MAX_SAFE_INTEGER,
))
const pending_search_query = ref(route_state.value.search_query ?? '')
const submitted_search_query = computed(() => route_state.value.search_query ?? '')
const search_mode = computed(() => getSearchPageMode({
  pending_query: pending_search_query.value,
  submitted_query: submitted_search_query.value,
}))
const search_results = computed(() => client_search_results.value)
const search_result_sections = computed(() => getSearchResultSections(search_results.value))
const search_empty_reason = computed(() => {
  if (search_mode.value === 'idle') {
    return 'empty-query'
  }

  if (search_mode.value === 'searching' && has_search_completed.value && search_results.value.length === 0) {
    return 'no-results'
  }

  return null
})

const search_request_runner = createLatestSearchRequestRunner<SearchSuggestion[]>()
const suggestion_request_runner = createLatestSearchRequestRunner<SearchSuggestion[]>()

watch(() => route_state.value.search_query ?? '', (query) => {
  if (pending_search_query.value !== query) {
    pending_search_query.value = query
  }
}, { immediate: true })

watch([pending_search_query, search_mode], async ([query, mode]) => {
  const normalized_query = query.trim()

  if (mode !== 'suggesting' || normalized_query === '') {
    suggestions.value = []
    is_suggestion_loading.value = false
    return
  }

  if (!import.meta.client) {
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
})

watch(() => route_state.value.search_query ?? '', async (query) => {
  await loadSubmittedSearch(query)
}, { immediate: true })

onMounted(() => {
  syncPendingSearchInputValue()
  is_search_input_ready.value = true
})

async function loadSubmittedSearch(query: string) {
  const normalized_query = query.trim()

  if (normalized_query === '') {
    client_search_results.value = []
    has_search_completed.value = false
    is_search_loading.value = false
    search_error.value = null
    return
  }

  if (!import.meta.client) {
    client_search_results.value = []
    return
  }

  is_search_loading.value = true
  has_search_completed.value = false
  search_error.value = null
  history_items.value = appendSearchHistoryItem(normalized_query, history_items.value)

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

function getResultTypeLabel(type: SearchSuggestion['type']) {
  if (type === 'guide') {
    return '指南'
  }

  if (type === 'link') {
    return '連結'
  }

  return '產品'
}

function onPopularTagClicked(tag: string) {
  history_items.value = appendSearchHistoryItem(tag, history_items.value)
}

function onSuggestionClicked(suggestion: SearchSuggestion) {
  submitSearch(suggestion.label)
}

function submitPendingSearchFromEvent(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) {
    return
  }

  event.preventDefault()
  submitSearch(getInputEventValue(event))
}

function submitSearch(query: string) {
  const normalized_query = query.trim()
  pending_search_query.value = normalized_query

  if (normalized_query === '') {
    clearSubmittedSearch()
    return
  }

  history_items.value = appendSearchHistoryItem(normalized_query, history_items.value)

  router.push({
    path: '/search',
    query: { q: normalized_query },
  })
}

function retrySearch() {
  if (search_mode.value === 'suggesting') {
    const query = pending_search_query.value.trim()

    if (query !== '') {
      is_suggestion_loading.value = true
      search_error.value = null

      void suggestion_request_runner.run(query, () => getClientSearchSuggestions(query))
        .then((response) => {
          if (response !== null) {
            suggestions.value = response.value
          }
        })
        .catch(() => {
          search_error.value = 'search-index-load-failed'
        })
        .finally(() => {
          is_suggestion_loading.value = false
        })
    }

    return
  }

  void loadSubmittedSearch(submitted_search_query.value)
}

function clearSubmittedSearch() {
  pending_search_query.value = ''
  router.push({ path: '/search', query: {} })
}

function onClearHistoryClicked() {
  history_items.value = clearSearchHistory(null)
}

function getInputEventValue(event: Event) {
  return event.target instanceof HTMLInputElement ? event.target.value : pending_search_query.value
}

function syncPendingSearchInputValue() {
  const input_value = search_input.value?.value ?? ''

  if (input_value === pending_search_query.value) {
    return
  }

  pending_search_query.value = input_value
}
</script>
