<template>
  <UCard
    class="product-card"
    :data-product-id="product.id"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <span
      class="product-transition-shell product-vt-card"
      :style="getProductViewTransitionStyle(product.id, 'card')"
      aria-hidden="true"
    />

    <NuxtLink
      :to="`/products/${product.id}`"
      class="product-card-link"
      :aria-label="`查看 ${product.name} 詳情`"
    >
      <span
        class="product-image-tile product-vt-image"
        :style="getProductViewTransitionStyle(product.id, 'image')"
      >
        <NuxtImg
          :src="product.image_url"
          :alt="product.name"
          class="product-image"
          loading="lazy"
          format="webp"
        />
      </span>

      <span class="product-card-body">
        <span
          class="product-name product-vt-title"
          :style="getProductViewTransitionStyle(product.id, 'title')"
        >{{ product.name }}</span>
        <span
          class="product-summary product-vt-summary"
          :style="getProductViewTransitionStyle(product.id, 'summary')"
        >{{ product.summary }}</span>
      </span>
    </NuxtLink>

    <span class="product-card-meta">
      <CatalogPill
        class="product-card-price product-vt-price"
        variant="accent"
        :style="getProductViewTransitionStyle(product.id, 'price')"
      >
        {{ product.price_label }}
      </CatalogPill>

      <CatalogPill
        class="channel-badge"
        variant="dark"
        :to="`/channel/${product.channel_id}`"
      >
        <span class="channel-dot" />
        {{ product.channel_label }}
      </CatalogPill>
    </span>
  </UCard>
</template>

<script setup lang="ts">
import type { ProductCardView } from '../utils/public-content-view-types'
import { getProductViewTransitionStyle } from '../utils/product-view-transition'

defineProps<{
  product: ProductCardView
}>()
</script>
