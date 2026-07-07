<template>
  <section
    v-if="products.length > 0"
    ref="section_root"
    class="related-products-section"
    :aria-label="title"
  >
    <h3 class="related-products-title">
      {{ title }}
    </h3>

    <div class="related-products-grid">
      <NuxtLink
        v-for="product in products"
        :key="product.id"
        :to="`/products/${product.id}`"
        class="related-product-card"
        :aria-label="`查看 ${product.name} 詳情`"
      >
        <span class="related-product-image-tile">
          <NuxtImg
            v-if="!isBrokenImage(product.id)"
            :src="product.image_url"
            :alt="product.name"
            class="related-product-image"
            :data-product-id="product.id"
            loading="lazy"
            format="webp"
            @error="onImageError(product.id)"
          />
          <UIcon
            name="i-lucide-image-off"
            class="related-product-fallback-icon"
            aria-hidden="true"
          />
        </span>

        <span class="related-product-body">
          <span class="related-product-name">{{ product.name }}</span>
          <span class="related-product-meta">{{ product.category_label }} · {{ product.channel_label }}</span>
        </span>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
// product/guide detail 逐字複製的 related 區塊收斂成單一元件：標題／aria 由 title prop 傳入
// （product「You may also like」、guide「相關商品」），破圖狀態內聚於本元件（useBrokenImageFallback）。
import type { RelatedProductCardView } from '../utils/public-content-view-types'

defineProps<{
  products: RelatedProductCardView[]
  title: string
}>()

const section_root = ref<HTMLElement | null>(null)
const { isBrokenImage, onImageError } = useBrokenImageFallback()

onMounted(() => {
  // SSR／快取已載入即失敗的圖，其 <img @error> 掛載後不會再觸發，故掃描 related 圖補偵測破圖。
  const related_images = section_root.value?.querySelectorAll<HTMLImageElement>('.related-product-image') ?? []

  for (const image of related_images) {
    const product_id = image.dataset.productId

    if (product_id !== undefined && image.complete && image.naturalWidth === 0) {
      onImageError(product_id)
    }
  }
})
</script>
