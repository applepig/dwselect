<template>
  <UModal
    v-model:open="modal_open"
    title="商品詳情"
    :fullscreen="fullscreen"
    scrollable
    dismissible
    overlay
    :ui="{ body: 'p-0' }"
  >
    <template #body>
      <article
        v-if="detail"
        :class="fullscreen ? 'product-detail-sheet' : 'product-detail-modal'"
        :data-product-id="detail.id"
      >
        <button
          type="button"
          class="detail-close-button"
          aria-label="關閉商品詳情"
          @click="modal_open = false"
        >
          <UIcon name="i-lucide-x" />
        </button>

        <div class="detail-hero-tile">
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
  </UModal>
</template>

<script setup lang="ts">
import type { ProductDetailView } from '../utils/published-products'

const props = defineProps<{
  open: boolean
  detail: ProductDetailView | null
  fullscreen: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const modal_open = computed({
  get: () => props.open,
  set: (open: boolean) => emit('update:open', open),
})
</script>
