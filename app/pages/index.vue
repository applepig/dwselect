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
      <UButton
        v-for="chip in compact_view.home.category_chips"
        :key="chip.id"
        type="button"
        class="category-chip"
        :color="chip.active ? 'primary' : 'neutral'"
        :variant="chip.active ? 'solid' : 'subtle'"
        :aria-pressed="chip.active"
        @click="onCategoryChipClicked(chip.id)"
      >
        <span>{{ chip.label }}</span>
        <template #trailing>
          <span class="chip-count">{{ chip.count }}</span>
        </template>
      </UButton>
    </div>

    <UEmpty
      v-if="compact_view.home.empty_reason"
      icon="i-lucide-package-open"
      title="目前沒有已上架商品"
    />

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
import { getCanonicalUrl, SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE } from '../utils/seo-metadata'

const home_canonical_url = getCanonicalUrl('/')

useHead({
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: home_canonical_url,
    },
  ],
})

useSeoMeta({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  ogTitle: SITE_NAME,
  ogDescription: SITE_DESCRIPTION,
  ogUrl: home_canonical_url,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: SITE_NAME,
  twitterDescription: SITE_DESCRIPTION,
  twitterImage: SITE_OG_IMAGE,
})

const route = useRoute()
const router = useRouter()
const { all_products, runtime_taxonomies, runtime_guides, runtime_links } = await useCatalogData()
const category_ids = computed(() => runtime_taxonomies.value?.categories.map((category) => category.id) ?? [])
const route_state = computed(() => getCompactAppStateFromRoute(
  { path: route.path, query: route.query },
  { category_ids: category_ids.value },
))
const compact_view = computed(() => {
  if (runtime_taxonomies.value === undefined || runtime_links.value === undefined || runtime_guides.value === undefined) {
    throw new Error('Catalog runtime data is not available')
  }

  return getCompactAppView(
    all_products.value,
    route_state.value,
    runtime_taxonomies.value,
    runtime_links.value,
    runtime_guides.value,
  )
})

function onCategoryChipClicked(category_id: CompactCategoryChip['id']) {
  router.push({
    path: '/',
    query: category_id === 'all' ? {} : { category: category_id },
  })
}
</script>
