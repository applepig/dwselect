<template>
  <section
    class="compact-panel"
    aria-label="指南詳情"
  >
    <GuideDetail
      v-if="guide_detail"
      :detail="guide_detail"
    />
  </section>
</template>

<script setup lang="ts">
import type { GuideDetailView } from '../../utils/public-content-view-types'
import { resolveRouteId } from '../../utils/resolve-route-id'
import { buildSeoMeta, getCanonicalUrl, getOgImageUrl, getSeoDescription } from '../../utils/seo-metadata'
import { SITE_NAME } from '../../utils/site-name'

const route = useRoute()
const guide_id = resolveRouteId(route.params.id)
const guide_detail = shallowRef<GuideDetailView | null>(null)
const guide_meta_title = computed(() => guide_detail.value === null ? SITE_NAME : `${guide_detail.value.title}｜${SITE_NAME}`)
const guide_meta_description = computed(() => getSeoDescription(guide_detail.value?.summary))
const guide_canonical_url = computed(() => {
  if (guide_detail.value === null) {
    return getCanonicalUrl('/guide')
  }

  return getCanonicalUrl(`/guide/${guide_detail.value.id}`)
})
const guide_og_image = computed(() => getOgImageUrl(guide_detail.value?.hero_image_url))
const guide_og_image_alt = computed(() => guide_detail.value?.hero_alt ?? SITE_NAME)

useHead(() => ({
  title: guide_meta_title.value,
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: guide_canonical_url.value,
    },
  ],
}))

useSeoMeta(buildSeoMeta({
  title: guide_meta_title,
  description: guide_meta_description,
  url: guide_canonical_url,
  image: guide_og_image,
  imageAlt: guide_og_image_alt,
}))

const guide_detail_data = await useGuideDetailData(guide_id)

if (guide_detail_data.value === null || guide_detail_data.value === undefined) {
  throw createError({
    statusCode: 404,
    message: '找不到指南',
    fatal: true,
  })
}

// useHead／useSeoMeta 需在 await 前同步註冊（見 head-before-async 測試），故 guide_detail 用獨立 ref；
// 改用 watchEffect 而非一次性賦值，content HMR 刷新 public-content 後才會把最新 detail 同步進來。
watchEffect(() => {
  guide_detail.value = guide_detail_data.value
})
</script>
