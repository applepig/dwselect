<template>
  <article
    class="product-detail-page"
    :data-product-id="detail.id"
  >
    <div
      class="detail-hero-tile"
      :style="{ 'view-transition-name': `product-image-${detail.id}` }"
    >
      <img
        :src="detail.hero_image"
        :alt="detail.hero_alt"
        class="detail-hero-image"
      >
    </div>

    <section class="detail-content">
      <div class="detail-meta-row">
        <UBadge
          class="channel-badge"
          size="xs"
        >
          <span class="channel-dot" />
          {{ detail.channel_label }}
        </UBadge>
        <UBadge
          class="detail-category"
          size="xs"
        >
          {{ detail.category_label }}
        </UBadge>
      </div>

      <h2 class="detail-title">
        {{ detail.title }}
      </h2>

      <p class="detail-price">
        {{ detail.price_label }}
      </p>

      <section class="detail-callout" aria-label="DW 怎麼說">
        <p class="detail-callout-label">
          DW 怎麼說
        </p>
        <p class="detail-callout-text">
          {{ detail.dw_says }}
        </p>
      </section>

      <p
        v-if="detail.description"
        class="detail-description"
      >
        {{ detail.description }}
      </p>

      <div
        class="detail-tag-list"
        aria-label="商品 tags"
      >
        <span
          v-for="tag in detail.tags"
          :key="tag"
          class="detail-tag"
        >
          {{ tag }}
        </span>
      </div>

      <UButton
        class="detail-buy-cta"
        :to="detail.buy_cta.href"
        target="_blank"
        rel="noopener noreferrer"
        block
        size="xl"
      >
        到 {{ detail.channel_label }} 購買
      </UButton>

      <p class="detail-fine-print">
        {{ detail.fine_print || '價格與庫存以通路頁面為準。' }}
      </p>
    </section>
  </article>
</template>

<script setup lang="ts">
import type { ProductDetailView } from '../utils/published-products'

defineProps<{
  detail: ProductDetailView
}>()
</script>
