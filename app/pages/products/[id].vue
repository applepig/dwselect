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
import type { Product } from '../../utils/product-schema'
import type { TaxonomyDefinitions } from '../../utils/published-products/types'
import { getCatalogProductId, getProductDetail, getRelatedProductCards } from '../../utils/published-products/product-detail'
import { getCanonicalUrl, getSeoDescription, SITE_NAME, SITE_OG_IMAGE } from '../../utils/seo-metadata'

const route = useRoute()
const product = shallowRef<Product | null>(null)
const all_products = shallowRef<Product[]>([])
const runtime_taxonomies = shallowRef<TaxonomyDefinitions | undefined>()
const product_detail = computed(() => {
  if (product.value === null) {
    return null
  }

  if (runtime_taxonomies.value === undefined) {
    throw new Error('Catalog runtime taxonomies are not available')
  }

  return {
    ...getProductDetail(product.value, runtime_taxonomies.value),
    related_products: getRelatedProductCards(product.value, all_products.value, runtime_taxonomies.value),
  }
})
const product_meta_title = computed(() => product_detail.value === null ? SITE_NAME : `${product_detail.value.title}｜${SITE_NAME}`)
const product_meta_description = computed(() => getSeoDescription(product.value?.summary))
const product_canonical_url = computed(() => {
  if (product.value === null) {
    return getCanonicalUrl('/')
  }

  return getCanonicalUrl(`/products/${getCatalogProductId(product.value)}`)
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

const catalog_data = await useCatalogData()
const raw_id = route.params.id
const product_id = Array.isArray(raw_id) ? raw_id[0] : raw_id
const matched_product = catalog_data.all_products.value.find((item) => getCatalogProductId(item) === product_id) ?? null

if (matched_product === null) {
  throw createError({
    statusCode: 404,
    message: '找不到商品',
    fatal: true,
  })
}

runtime_taxonomies.value = catalog_data.runtime_taxonomies.value
all_products.value = catalog_data.all_products.value
product.value = matched_product
</script>
