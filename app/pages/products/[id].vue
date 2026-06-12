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

useHead(() => ({
  title: product_detail.value === null ? 'DW嚴選' : `${product_detail.value.title}｜DW嚴選`,
}))

const catalog_data = await useCatalogData()
const raw_id = route.params.id
const product_id = Array.isArray(raw_id) ? raw_id[0] : raw_id
const matched_product = catalog_data.all_products.value.find((item) => getCatalogProductId(item) === product_id) ?? null

if (matched_product === null) {
  throw createError({
    statusCode: 404,
    statusMessage: '找不到商品',
  })
}

runtime_taxonomies.value = catalog_data.runtime_taxonomies.value
all_products.value = catalog_data.all_products.value
product.value = matched_product
</script>
