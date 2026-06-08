<template>
  <UCard
    class="product-card"
    :data-product-id="product.id"
    :style="{
      'view-transition-name': `product-card-${product.id}`,
      'view-transition-class': 'product-card',
    }"
    :ui="{ body: 'p-0' }"
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
          :src="product.image"
          :alt="product.name"
          class="product-image"
          loading="lazy"
        >

        <span class="product-image-overlay">
          <UBadge
            class="channel-badge"
            size="xs"
          >
            <span class="channel-dot" />
            {{ product.channel }}
          </UBadge>

          <UBadge
            class="product-card-price"
            size="sm"
          >
            {{ product.price }}
          </UBadge>
        </span>
      </span>

      <span class="product-card-body">
        <span class="product-name">{{ product.name }}</span>
        <span class="product-summary">{{ product.summary }}</span>
      </span>
    </NuxtLink>
  </UCard>
</template>

<script setup lang="ts">
import type { PublishedProductCard } from '../utils/published-products'

defineProps<{
  product: PublishedProductCard
}>()
</script>
