<template>
  <section
    class="compact-panel"
    aria-label="搜尋"
  >
    <SearchInput
      v-model:query="pending_search_query"
      @submit="submitSearch"
      @clear="clearSubmittedSearch"
    />

    <SearchErrorPanel
      v-if="search_error !== null"
      @retry="retrySearch"
      @clear="clearSubmittedSearch"
    />

    <SearchIdlePanel
      v-else-if="search_mode === 'idle'"
      :history_items="history_items"
      :popular_search_tags="popular_search_tags"
      @history-clicked="submitSearch"
    />

    <SearchSuggestionList
      v-else-if="search_mode === 'suggesting'"
      :suggestions="suggestions"
      :is_suggestion_loading="is_suggestion_loading"
      @suggestion-clicked="onSuggestionClicked"
    />

    <UEmpty
      v-else-if="search_empty_reason === 'no-results'"
      icon="i-lucide-search-x"
      title="沒這個坑，去許願吧"
    />

    <UEmpty
      v-else-if="search_mode === 'searching' && is_search_loading"
      icon="i-lucide-loader-circle"
      title="搜尋中"
    />

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
import SearchErrorPanel from '../components/search/search-error-panel.vue'
import SearchIdlePanel from '../components/search/search-idle-panel.vue'
import SearchInput from '../components/search/search-input.vue'
import SearchSuggestionList from '../components/search/search-suggestion-list.vue'
import { useSearchPage } from '../composables/use-search-page'
import { getCompactAppStateFromRoute } from '../utils/published-products/compact-app'
import { getSearchResultSections } from '../utils/published-products/resource-rows'
import { getCanonicalUrl, SITE_NAME, SITE_OG_IMAGE } from '../utils/seo-metadata'
import type { SearchSuggestion } from '../utils/search/search-index'

const SEARCH_DESCRIPTION = '搜尋 DW嚴選的商品、指南與連結，快速找到值得買、值得看、值得收藏的內容。'
const search_canonical_url = getCanonicalUrl('/search')

useHead({
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: search_canonical_url,
    },
  ],
})

useSeoMeta({
  title: `搜尋｜${SITE_NAME}`,
  description: SEARCH_DESCRIPTION,
  ogTitle: `搜尋｜${SITE_NAME}`,
  ogDescription: SEARCH_DESCRIPTION,
  ogUrl: search_canonical_url,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: `搜尋｜${SITE_NAME}`,
  twitterDescription: SEARCH_DESCRIPTION,
  twitterImage: SITE_OG_IMAGE,
})

const route = useRoute()
const router = useRouter()
const { content_payload } = await useCatalogData()
const route_state = computed(() => ({
  ...getCompactAppStateFromRoute({ path: route.path, query: route.query }),
}))
const submitted_search_query = computed(() => route_state.value.search_query ?? '')
const {
  pending_search_query,
  search_mode,
  suggestions,
  client_search_results,
  history_items,
  is_search_loading,
  is_suggestion_loading,
  has_search_completed,
  search_error,
  retrySearch,
  clearSubmittedSearch,
  submitSearch,
} = useSearchPage({
  submitted_search_query,
  navigateToSearch,
})
const popular_search_tags = computed(() => content_payload.value?.navigation.popular_search_tags ?? { tags: [], brands: [] })
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

function onSuggestionClicked(suggestion: SearchSuggestion) {
  submitSearch(suggestion.label)
}

function navigateToSearch(query: string | null) {
  router.push({
    path: '/search',
    query: query === null ? {} : { q: query },
  })
}
</script>
