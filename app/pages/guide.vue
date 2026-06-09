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

    <div
      v-else
      class="link-list"
    >
      <a
        v-for="guide in compact_view.guide.guides"
        :key="guide.id"
        class="link-row"
        :href="guide.source_url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="link-row-icon">📘</span>
        <span class="link-row-body">
          <span class="link-row-title">{{ guide.title }}</span>
          <span class="link-row-subtitle">{{ guide.summary }}</span>
          <span class="link-row-subtitle">{{ guide.category_labels.join('、') }}</span>
        </span>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products'

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
