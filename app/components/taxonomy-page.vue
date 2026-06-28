<template>
  <section
    class="compact-panel taxonomy-panel"
    :aria-label="data.label"
  >
    <!-- 標題改由 layout breadcrumb 充當 h1（對齊 detail 頁），頁內不再放重複 H1／kicker；
         僅保留 description 段（tag/brand 有簡介時顯示，category/channel 無 description，AC26）。 -->
    <header
      v-if="data.description"
      class="taxonomy-page-header"
    >
      <p class="taxonomy-page-description">
        {{ data.description }}
      </p>
    </header>

    <section
      v-if="data.products.length > 0"
      class="taxonomy-section taxonomy-products-section"
      aria-label="商品"
    >
      <div class="product-grid">
        <ProductCard
          v-for="product in data.products"
          :key="product.id"
          :product="product"
        />
      </div>
    </section>

    <section
      v-if="data.guides.length > 0"
      class="taxonomy-section taxonomy-guides-section"
      aria-label="指南"
    >
      <ResourceList
        :rows="data.guides"
        aria_label="指南列表"
      />
    </section>

    <section
      v-if="data.links.length > 0"
      class="taxonomy-section taxonomy-links-section"
      aria-label="連結"
    >
      <ResourceList
        :rows="data.links"
        aria_label="連結列表"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import type { TaxonomyPageData } from '../utils/published-products/types'

defineProps<{
  data: TaxonomyPageData
}>()
</script>
