<template>
  <section
    class="compact-panel"
    aria-label="連結"
  >
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
import { getCompactAppView } from '../utils/published-products/compact-app'
import { buildSeoMeta, getCanonicalUrl, SITE_OG_IMAGE } from '../utils/seo-metadata'
import { SITE_NAME } from '../utils/site-name'

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

useSeoMeta(buildSeoMeta({
  title: `連結｜${SITE_NAME}`,
  description: LINKS_DESCRIPTION,
  url: links_canonical_url,
  image: SITE_OG_IMAGE,
}))

const { content_payload } = await useCatalogData()
const compact_view = computed(() => {
  if (content_payload.value === null || content_payload.value === undefined) {
    throw new Error('Catalog runtime data is not available')
  }

  return getCompactAppView(content_payload.value)
})
</script>
