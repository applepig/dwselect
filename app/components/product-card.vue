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
        ref="image_tile"
        class="product-image-tile product-vt-image"
        :style="getProductViewTransitionStyle(product.id, 'image')"
      >
        <NuxtImg
          v-if="!isBrokenImage(product.id)"
          :src="product.image_url"
          :alt="product.name"
          class="product-image"
          :loading="eager ? 'eager' : 'lazy'"
          :fetchpriority="high_priority ? 'high' : undefined"
          :sizes="sizes"
          :quality="75"
          format="webp"
          @error="onImageError(product.id)"
        />
        <UIcon
          v-else
          name="i-lucide-image-off"
          class="product-image-fallback-icon"
          aria-hidden="true"
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
        >{{ product.short_description }}</span>
      </span>
    </NuxtLink>

    <span class="product-card-meta">
      <CatalogPill
        class="product-card-price product-vt-price"
        variant="price"
        :style="getProductViewTransitionStyle(product.id, 'price')"
      >
        {{ product.price_label }}
      </CatalogPill>

      <CatalogPill
        class="channel-badge product-vt-channel"
        :to="`/channel/${product.channel_id}`"
        :style="getProductViewTransitionStyle(product.id, 'channel')"
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

const props = withDefaults(defineProps<{
  product: ProductCardView
  // 首屏可視卡設 eager，讓 LCP 候選圖不被 lazy 延後；其餘（預設）維持 lazy。
  eager?: boolean
  // 僅真正的 LCP 候選圖（首列）設 high，讓 preload scanner 立即高優先抓取；其餘 eager 卡維持
  // 預設優先序，避免多張 fetchpriority=high 稀釋頻寬、與 LCP 圖搶頻寬（web.dev 反模式）。
  high_priority?: boolean
  // 響應式尺寸提示：預設對齊首頁／taxonomy 的 .product-grid——桌機 auto-fill 欄寬近定值（≤340px）
  // 故用固定 px、手機單欄用 92vw；候選收斂為 4 個寬度（含 888w 覆蓋 DPR2–3 手機首屏）。
  // related-products 的 96px 縮圖版型於使用處另傳覆蓋值，避免縮圖挑到過大候選。
  sizes?: string
}>(), {
  eager: false,
  high_priority: false,
  sizes: '483:92vw 484:340px',
})

const image_tile = ref<HTMLElement | null>(null)
const { isBrokenImage, onImageError, scanForBrokenImage } = useBrokenImageFallback()

onMounted(() => {
  // SSR／快取已載入即失敗的圖，其 <img @error> 掛載後不會再觸發，掛載時補掃一次。
  scanForBrokenImage(image_tile.value, '.product-image', props.product.id)
})
</script>
