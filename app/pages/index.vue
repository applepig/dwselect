<template>
  <section
    class="compact-panel"
    aria-label="首頁"
  >
    <div class="section-heading-row">
      <div>
        <p class="section-kicker">
          Home
        </p>
        <h2 class="section-title">
          最近值得看
        </h2>
      </div>
    </div>

    <div
      class="category-chip-list"
      aria-label="商品分類"
    >
      <button
        v-for="chip in compact_view.home.category_chips"
        :key="chip.id"
        type="button"
        class="category-chip"
        :class="{ 'is-active': chip.active }"
        :aria-pressed="chip.active"
        @click="onCategoryChipClicked(chip.id)"
      >
        <span>{{ chip.label }}</span>
        <span class="chip-count">{{ chip.count }}</span>
      </button>
    </div>

    <div
      v-if="compact_view.home.empty_reason"
      class="compact-empty-state"
    >
      <p class="empty-title">
        目前沒有已上架商品
      </p>
    </div>

    <div
      v-else
      class="product-grid"
    >
      <ProductCard
        v-for="product in compact_view.home.products"
        :key="product.id"
        :product="product"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CompactCategoryChip } from '../utils/published-products/types'
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products/compact-app'

const route = useRoute()
const router = useRouter()
const { all_products, runtime_taxonomies, runtime_guides, runtime_links } = await useCatalogData()
const category_ids = computed(() => runtime_taxonomies.value?.categories.map((category) => category.id) ?? [])
const route_state = computed(() => getCompactAppStateFromRoute(
  { path: route.path, query: route.query },
  { category_ids: category_ids.value },
))
const compact_view = computed(() => getCompactAppView(
  all_products.value,
  route_state.value,
  runtime_taxonomies.value,
  runtime_links.value,
  runtime_guides.value,
))

function onCategoryChipClicked(category_id: CompactCategoryChip['id']) {
  router.push({
    path: '/',
    query: category_id === 'all' ? {} : { category: category_id },
  })
}
</script>
