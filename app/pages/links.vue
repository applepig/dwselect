<template>
  <section
    class="compact-panel"
    aria-label="連結"
  >
    <div class="section-heading-row">
      <div>
        <p class="section-kicker">
          Links
        </p>
        <h2 class="section-title">
          相關入口
        </h2>
      </div>
    </div>

    <LinkPanel :links="compact_view.links" />
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products'

const route = useRoute()
const { all_products, runtime_taxonomies, runtime_links } = await useCatalogData()
const route_state = computed(() => getCompactAppStateFromRoute({ path: route.path, query: route.query }))
const compact_view = computed(() => getCompactAppView(
  all_products.value,
  route_state.value,
  runtime_taxonomies.value,
  runtime_links.value,
))
</script>
