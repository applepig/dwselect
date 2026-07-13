<template>
  <section
    v-if="products.length > 0"
    class="related-products-section"
    :aria-label="title"
  >
    <h3 class="related-products-title">
      {{ title }}
    </h3>

    <div class="related-products-grid">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        sizes="720:96px 743:30vw 1600:30vw"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
// product/guide detail 逐字複製的 related 區塊收斂成單一元件：標題／aria 由 title prop 傳入
// （product「You may also like」、guide「相關商品」）。卡片直接重用 ProductCard（ADR-036-6），
// 卡片版型與破圖 fallback 皆以首頁卡為單一來源，本元件只負責標題與 grid 容器。
// sizes 覆蓋預設：related 版型 ≤743px 是固定 96px 橫式縮圖（非全寬卡），沿用首頁的 340px
// 提示會讓手機縮圖挑到過大候選；此處按 96px 縮圖／≥744px 3 欄（~30vw）重新校準。
import type { ProductCardView } from '../utils/public-content-view-types'

defineProps<{
  products: ProductCardView[]
  title: string
}>()
</script>
