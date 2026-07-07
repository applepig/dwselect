<template>
  <section
    class="compact-panel"
    aria-label="商品詳情"
  >
    <ProductDetail
      v-if="product_detail"
      :detail="product_detail"
    />
  </section>
</template>

<script setup lang="ts">
import type { ProductDetailView } from '../../utils/public-content-view-types'
import { resolveRouteId } from '../../utils/resolve-route-id'
import { buildSeoMeta, getCanonicalUrl, getOgImageUrl, getSeoDescription } from '../../utils/seo-metadata'
import { SITE_NAME } from '../../utils/site-name'

const route = useRoute()
const product_id = resolveRouteId(route.params.id)
const product_detail = shallowRef<ProductDetailView | null>(null)
const product_meta_title = computed(() => product_detail.value === null ? SITE_NAME : `${product_detail.value.name}｜${SITE_NAME}`)
const product_meta_description = computed(() => getSeoDescription(product_detail.value?.summary))
const product_canonical_url = computed(() => {
  if (product_detail.value === null) {
    return getCanonicalUrl('/')
  }

  return getCanonicalUrl(`/products/${product_detail.value.id}`)
})
const product_og_image = computed(() => getOgImageUrl(product_detail.value?.hero_image_url))
const product_og_image_alt = computed(() => product_detail.value?.hero_alt ?? SITE_NAME)

useHead(() => ({
  title: product_meta_title.value,
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: product_canonical_url.value,
    },
  ],
}))

useSeoMeta(buildSeoMeta({
  title: product_meta_title,
  description: product_meta_description,
  url: product_canonical_url,
  image: product_og_image,
  imageAlt: product_og_image_alt,
}))

const product_detail_data = await useProductDetailData(product_id)

if (product_detail_data.value === null || product_detail_data.value === undefined) {
  throw createError({
    statusCode: 404,
    message: '找不到商品',
    fatal: true,
  })
}

// useHead／useSeoMeta 需在 await 前同步註冊（見 head-before-async 測試），故 product_detail 用獨立 ref；
// 改用 watchEffect 而非一次性賦值，content HMR 刷新 public-content 後才會把最新 detail 同步進來。
watchEffect(() => {
  product_detail.value = product_detail_data.value
})
</script>
