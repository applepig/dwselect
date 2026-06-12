<template>
  <section
    class="compact-panel"
    aria-label="指南"
  >
    <div class="section-heading-row">
      <div>
        <p class="section-kicker">
          Guide
        </p>
        <h2 class="section-title">
          指南列表
        </h2>
      </div>
    </div>

    <div
      v-if="compact_view.guide.empty_reason"
      class="compact-empty-state"
    >
      <p class="empty-title">
        目前沒有已發布指南
      </p>
    </div>

    <ResourceList
      v-else
      :rows="compact_view.guide.guides"
      aria_label="指南列表"
    />
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products/compact-app'

const route = useRoute()
const { all_products, runtime_taxonomies, runtime_guides, runtime_links } = await useCatalogData()
const route_state = computed(() => getCompactAppStateFromRoute({ path: route.path, query: route.query }))
const compact_view = computed(() => getCompactAppView(
  all_products.value,
  route_state.value,
  runtime_taxonomies.value,
  runtime_links.value,
  runtime_guides.value,
))
</script>
