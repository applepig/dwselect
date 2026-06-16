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
import { getCanonicalUrl, getSeoDescription, SITE_NAME, SITE_OG_IMAGE } from '../../utils/seo-metadata'

const route = useRoute()
const raw_id = route.params.id
const product_id = (Array.isArray(raw_id) ? raw_id[0] : raw_id) ?? ''
const product_detail = shallowRef<ProductDetailView | null>(null)
const product_meta_title = computed(() => product_detail.value === null ? SITE_NAME : `${product_detail.value.name}｜${SITE_NAME}`)
const product_meta_description = computed(() => getSeoDescription(product_detail.value?.summary))
const product_canonical_url = computed(() => {
  if (product_detail.value === null) {
    return getCanonicalUrl('/')
  }

  return getCanonicalUrl(`/products/${product_detail.value.id}`)
})

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

useSeoMeta({
  title: product_meta_title,
  description: product_meta_description,
  ogTitle: product_meta_title,
  ogDescription: product_meta_description,
  ogUrl: product_canonical_url,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: product_meta_title,
  twitterDescription: product_meta_description,
  twitterImage: SITE_OG_IMAGE,
})

const product_detail_data = await useProductDetailData(product_id)

if (product_detail_data.value === null || product_detail_data.value === undefined) {
  throw createError({
    statusCode: 404,
    message: '找不到商品',
    fatal: true,
  })
}

product_detail.value = product_detail_data.value
</script>
