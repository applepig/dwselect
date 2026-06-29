<template>
  <div class="compact-page">
    <CategoryChipBar />

    <TaxonomyPage
      v-if="page_data"
      :data="page_data"
    />
  </div>
</template>

<script setup lang="ts">
import type { TaxonomyPageData } from '../../utils/published-products/types'
import { buildTaxonomyPageSeo } from '../../utils/published-products/taxonomy-page-seo'
import { getCanonicalUrl, SITE_NAME, SITE_OG_IMAGE } from '../../utils/seo-metadata'

const route = useRoute()
const raw_id = route.params.id
const category_id = (Array.isArray(raw_id) ? raw_id[0] : raw_id) ?? ''
const page_data = shallowRef<TaxonomyPageData | null>(null)

// canonical 由 route id 同步推導（不需等 fetch）；title／description 等 fetch 解析 label 後才有意義，
// 未解析前以站名／站台預設 OG 圖墊底，與 detail 頁慣例一致。
const canonical_url = getCanonicalUrl(`/category/${category_id}`)
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

const taxonomy_page_data = await useTaxonomyPageData('category', category_id)

// 三型別全空（或 category id 不存在）→ 該路由不 prerender，直接訪問須主動丟 404，對齊 products/[id].vue。
if (taxonomy_page_data.value === null) {
  throw createError({
    statusCode: 404,
    message: '找不到分類',
    fatal: true,
  })
}

watchEffect(() => {
  page_data.value = taxonomy_page_data.value
})
</script>
