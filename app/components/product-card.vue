<template>
  <UCard
    class="product-card"
    :data-product-id="product.id"
    :style="{
      'view-transition-name': `product-card-${product.id}`,
      'view-transition-class': 'product-card',
    }"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <NuxtLink
      :to="`/products/${product.id}`"
      class="product-card-link"
      :aria-label="`查看 ${product.name} 詳情`"
    >
      <span
        class="product-image-tile"
        :style="{ 'view-transition-name': `product-image-${product.id}` }"
      >
        <img
          :src="product.image_url"
          :alt="product.name"
          class="product-image"
          loading="lazy"
        >
      </span>

      <span class="product-card-body">
        <span class="product-name">{{ product.name }}</span>
        <span class="product-summary">{{ product.summary }}</span>
      </span>
    </NuxtLink>

    <span class="product-card-meta">
      <CatalogPill
        class="product-card-price"
        variant="accent"
      >
        {{ product.price_label }}
      </CatalogPill>

      <CatalogPill
        class="channel-badge"
        variant="dark"
        :to="{ path: '/search', query: { q: product.channel_label } }"
      >
        <span class="channel-dot" />
        {{ product.channel_label }}
      </CatalogPill>
    </span>
  </UCard>
</template>

<script setup lang="ts">
import type { ProductCardView } from '../utils/public-content-view-types'

defineProps<{
  product: ProductCardView
}>()
</script>
