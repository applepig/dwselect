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

    <UInput
      v-model="pending_search_query"
      class="search-input"
      placeholder="在找什麼嗎？™"
      icon="i-lucide-search"
      size="xl"
      autocomplete="off"
    />

    <div
      v-if="search_empty_reason === 'empty-query'"
      class="search-empty-panel"
    >
      <p class="empty-title">
        熱門 tag
      </p>
      <div class="tag-chip-list">
        <button
          v-for="tag in compact_view.top_tags.slice(0, 10)"
          :key="`search-tag-${tag.label}`"
          type="button"
          class="tag-chip"
          @click="onPopularTagClicked(tag.label)"
        >
          <span>{{ tag.label }}</span>
          <span class="tag-count">{{ tag.count }}</span>
        </button>
      </div>
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
      v-else
      class="search-results"
    >
      <article
        v-for="result in search_results"
        :key="result.document_id"
        class="search-result-card"
      >
        <a
          v-if="result.external"
          :href="result.href"
          class="search-result-row"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="search-result-meta">
            <span class="search-result-type">{{ getResultTypeLabel(result.type) }}</span>
            <span v-if="result.channel_label">{{ result.channel_label }}</span>
            <span v-if="result.price_text">{{ result.price_text }}</span>
          </span>
          <span class="search-result-title">{{ result.title }}</span>
          <span class="search-result-summary">{{ result.summary }}</span>
          <span class="search-result-labels">
            <span
              v-for="label in [...result.category_labels, ...result.tag_labels].slice(0, 4)"
              :key="`${result.document_id}-${label}`"
              class="search-result-label"
            >{{ label }}</span>
          </span>
        </a>

        <NuxtLink
          v-else
          :to="result.href"
          class="search-result-row"
        >
          <span class="search-result-meta">
            <span class="search-result-type">{{ getResultTypeLabel(result.type) }}</span>
            <span v-if="result.channel_label">{{ result.channel_label }}</span>
            <span v-if="result.price_text">{{ result.price_text }}</span>
          </span>
          <span class="search-result-title">{{ result.title }}</span>
          <span class="search-result-summary">{{ result.summary }}</span>
          <span class="search-result-labels">
            <span
              v-for="label in [...result.category_labels, ...result.tag_labels].slice(0, 4)"
              :key="`${result.document_id}-${label}`"
              class="search-result-label"
            >{{ label }}</span>
          </span>
        </NuxtLink>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PublishedProductCard } from '../utils/published-products'
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products'
import type { SearchSuggestion } from '../utils/search/search-index'
import { getClientSearchResults } from '../utils/search/client-search'

const route = useRoute()
const router = useRouter()
const { all_products, runtime_taxonomies, runtime_guides, runtime_links } = await useCatalogData()
const client_search_results = ref<SearchSuggestion[] | null>(null)
const route_state = computed(() => ({
  ...getCompactAppStateFromRoute({ path: route.path, query: route.query }),
  search_result_ids: client_search_results.value
    ?.filter((result) => result.type === 'product')
    .map((result) => result.content_id) ?? null,
}))
const compact_view = computed(() => getCompactAppView(
  all_products.value,
  route_state.value,
  runtime_taxonomies.value,
  runtime_links.value,
  runtime_guides.value,
))
const pending_search_query = ref(route_state.value.search_query ?? '')
const search_results = computed(() => {
  if (client_search_results.value !== null) {
    return client_search_results.value
  }

  return compact_view.value.search.products.map(mapProductCardToSearchResult)
})
const search_empty_reason = computed(() => {
  if (compact_view.value.search.query === '') {
    return 'empty-query'
  }

  if (search_results.value.length === 0) {
    return 'no-results'
  }

  return null
})

let replace_timer: ReturnType<typeof setTimeout> | null = null
let search_request_id = 0

watch(() => route_state.value.search_query ?? '', (query) => {
  if (pending_search_query.value !== query) {
    pending_search_query.value = query
  }
}, { immediate: true })

watch(pending_search_query, (query) => {
  if (query.trim() === (route_state.value.search_query ?? '')) {
    return
  }

  if (replace_timer !== null) {
    clearTimeout(replace_timer)
  }

  replace_timer = setTimeout(() => {
    router.replace({
      path: '/search',
      query: query.trim() === '' ? {} : { q: query.trim() },
    })
  }, 250)
})

watch(() => route_state.value.search_query ?? '', async (query) => {
  const request_id = search_request_id + 1
  search_request_id = request_id

  if (query.trim() === '') {
    client_search_results.value = null
    return
  }

  if (!import.meta.client) {
    client_search_results.value = null
    return
  }

  try {
    const results = await getClientSearchResults(query)

    if (request_id !== search_request_id) {
      return
    }

    client_search_results.value = results
  }
  catch {
    if (request_id !== search_request_id) {
      return
    }

    client_search_results.value = null
  }
}, { immediate: true })

function mapProductCardToSearchResult(product: PublishedProductCard): SearchSuggestion {
  return {
    document_id: `product:${product.id}`,
    content_id: product.id,
    type: 'product',
    label: product.name,
    title: product.name,
    summary: product.summary,
    category_labels: [product.category],
    tag_labels: product.tags,
    image_url: product.image,
    href: `/products/${product.id}`,
    external: false,
    price_text: product.price,
    channel_id: product.channel_id,
    channel_label: product.channel,
    score: 0,
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
  router.push({
    path: '/search',
    query: { q: tag },
  })
}

onBeforeUnmount(() => {
  if (replace_timer !== null) {
    clearTimeout(replace_timer)
  }
})
</script>
