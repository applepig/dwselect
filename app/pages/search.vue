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
      v-if="compact_view.search.empty_reason === 'empty-query'"
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
      v-else-if="compact_view.search.empty_reason === 'no-results'"
      class="compact-empty-state"
    >
      <p class="empty-title">
        沒這個坑，去許願吧
      </p>
    </div>

    <div
      v-else
      class="product-grid"
    >
      <ProductCard
        v-for="product in compact_view.search.products"
        :key="product.id"
        :product="product"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products'
import { getClientSearchResults } from '../utils/search/client-search'

const route = useRoute()
const router = useRouter()
const { all_products, runtime_taxonomies, runtime_links } = await useCatalogData()
const client_search_result_ids = ref<string[] | null>(null)
const route_state = computed(() => ({
  ...getCompactAppStateFromRoute({ path: route.path, query: route.query }),
  search_result_ids: client_search_result_ids.value,
}))
const compact_view = computed(() => getCompactAppView(
  all_products.value,
  route_state.value,
  runtime_taxonomies.value,
  runtime_links.value,
))
const pending_search_query = ref(route_state.value.search_query ?? '')

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
    client_search_result_ids.value = null
    return
  }

  if (!import.meta.client) {
    client_search_result_ids.value = null
    return
  }

  try {
    const search_results = await getClientSearchResults(query)

    if (request_id !== search_request_id) {
      return
    }

    client_search_result_ids.value = search_results.map((result) => result.id)
  }
  catch {
    if (request_id !== search_request_id) {
      return
    }

    client_search_result_ids.value = null
  }
}, { immediate: true })

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
