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

    <UEmpty
      v-if="compact_view.links.length === 0"
      icon="i-lucide-link"
      title="目前沒有已發布連結"
    />

    <LinkPanel
      v-else
      :links="compact_view.links"
    />
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products/compact-app'
import { getCanonicalUrl, SITE_NAME, SITE_OG_IMAGE } from '../utils/seo-metadata'

const LINKS_DESCRIPTION = '整理 DW嚴選相關入口與延伸資源。'
const links_canonical_url = getCanonicalUrl('/links')

useHead({
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: links_canonical_url,
    },
  ],
})

useSeoMeta({
  title: `連結｜${SITE_NAME}`,
  description: LINKS_DESCRIPTION,
  ogTitle: `連結｜${SITE_NAME}`,
  ogDescription: LINKS_DESCRIPTION,
  ogUrl: links_canonical_url,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: `連結｜${SITE_NAME}`,
  twitterDescription: LINKS_DESCRIPTION,
  twitterImage: SITE_OG_IMAGE,
})

const route = useRoute()
const { all_products, runtime_taxonomies, runtime_guides, runtime_links } = await useCatalogData()
const route_state = computed(() => getCompactAppStateFromRoute({ path: route.path, query: route.query }))
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
</script>
