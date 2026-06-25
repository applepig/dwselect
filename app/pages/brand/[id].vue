<template>
  <TaxonomyPage
    v-if="page_data"
    :data="page_data"
  />
</template>

<script setup lang="ts">
import type { TaxonomyPageData } from '../../utils/published-products/types'
import { buildTaxonomyPageSeo } from '../../utils/published-products/taxonomy-page-seo'
import { getCanonicalUrl, SITE_NAME, SITE_OG_IMAGE } from '../../utils/seo-metadata'

const route = useRoute()
const raw_id = route.params.id
const brand_id = (Array.isArray(raw_id) ? raw_id[0] : raw_id) ?? ''
const page_data = shallowRef<TaxonomyPageData | null>(null)

// brand 走專屬 /brand/{id} 前綴、單一 canonical（ADR-8/10），與 tag 頁分流。
const canonical_url = getCanonicalUrl(`/brand/${brand_id}`)
const meta_title = computed(() => {
  if (page_data.value === null) {
    return SITE_NAME
  }

  return buildTaxonomyPageSeo(page_data.value).title
})
const meta_description = computed(() => {
  if (page_data.value === null) {
    return SITE_NAME
  }

  return buildTaxonomyPageSeo(page_data.value).description
})

useHead(() => ({
  title: meta_title.value,
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: canonical_url,
    },
  ],
}))

useSeoMeta({
  title: meta_title,
  description: meta_description,
  ogTitle: meta_title,
  ogDescription: meta_description,
  ogUrl: canonical_url,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: meta_title,
  twitterDescription: meta_description,
  twitterImage: SITE_OG_IMAGE,
})

const taxonomy_page_data = await useTaxonomyPageData('brand', brand_id)

// 三型別全空（或 brand id 不存在）→ 該路由不 prerender，直接訪問須主動丟 404，對齊 tag/[id].vue。
if (taxonomy_page_data.value === null) {
  throw createError({
    statusCode: 404,
    message: '找不到品牌',
    fatal: true,
  })
}

watchEffect(() => {
  page_data.value = taxonomy_page_data.value
})
</script>
