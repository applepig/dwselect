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

    <UEmpty
      v-if="compact_view.guide.empty_reason"
      icon="i-lucide-book-open"
      title="目前沒有已發布指南"
    />

    <ResourceList
      v-else
      :rows="compact_view.guide.guides"
      aria_label="指南列表"
    />
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getCompactAppView } from '../utils/published-products/compact-app'
import { getCanonicalUrl, SITE_NAME, SITE_OG_IMAGE } from '../utils/seo-metadata'

const GUIDE_DESCRIPTION = '選物指南、購買筆記與使用心得，幫你快速理解值得買的理由。'
const guide_canonical_url = getCanonicalUrl('/guide')

useHead({
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: guide_canonical_url,
    },
  ],
})

useSeoMeta({
  title: `指南｜${SITE_NAME}`,
  description: GUIDE_DESCRIPTION,
  ogTitle: `指南｜${SITE_NAME}`,
  ogDescription: GUIDE_DESCRIPTION,
  ogUrl: guide_canonical_url,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: `指南｜${SITE_NAME}`,
  twitterDescription: GUIDE_DESCRIPTION,
  twitterImage: SITE_OG_IMAGE,
})

const route = useRoute()
const { content_payload } = await useCatalogData()
const route_state = computed(() => getCompactAppStateFromRoute({ path: route.path, query: route.query }))
const compact_view = computed(() => {
  if (content_payload.value === null || content_payload.value === undefined) {
    throw new Error('Catalog runtime data is not available')
  }

  return getCompactAppView(content_payload.value, route_state.value)
})
</script>
