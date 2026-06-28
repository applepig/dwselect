<template>
  <div class="compact-page">
    <CategoryChipBar />

    <section
      class="compact-panel"
      aria-label="首頁"
    >
      <div
        class="home-results"
      >
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
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

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
const nuxt_app = useNuxtApp()
const catalog_data = useCatalogData()
onMounted(() => {
  void catalog_data.then(({ category_ids }) => {
    const category_query = route.query.category

    if (typeof category_query !== 'string') {
      return
    }

    if (!category_ids.value.has(category_query)) {
      return
    }

    void nuxt_app.runWithContext(() => navigateTo(`/category/${category_query}`, { replace: true }))
  })
})
const { content_payload } = await catalog_data

const route_state = computed(() => getCompactAppStateFromRoute(
  { path: route.path, query: route.query },
))
const compact_view = computed(() => {
  if (content_payload.value === null || content_payload.value === undefined) {
    throw new Error('Catalog runtime data is not available')
  }

  return getCompactAppView(content_payload.value, route_state.value)
})
</script>
