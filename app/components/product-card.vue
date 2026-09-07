<template>
  <UCard
    class="product-card"
    :data-product-id="product.id"
    :ui="{ body: 'p-0 sm:p-0' }"
    @click.capture="onCardClicked"
  >
    <span
      class="product-transition-shell product-vt-card"
      :style="getActiveViewTransitionStyle('card')"
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
        :style="getActiveViewTransitionStyle('image')"
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
          :style="getActiveViewTransitionStyle('title')"
        >{{ product.name }}</span>
        <span
          class="product-summary product-vt-summary"
          :style="getActiveViewTransitionStyle('summary')"
        >{{ product.short_description }}</span>
      </span>
    </NuxtLink>

    <span class="product-card-meta">
      <CatalogPill
        class="product-card-price product-vt-price"
        variant="price"
        :style="getActiveViewTransitionStyle('price')"
      >
        {{ product.price_label }}
      </CatalogPill>

      <CatalogPill
        class="channel-badge product-vt-channel"
        :to="`/channel/${product.channel_id}`"
        :style="getActiveViewTransitionStyle('channel')"
      >
        <span class="channel-dot" />
        {{ product.channel_label }}
      </CatalogPill>
    </span>
  </UCard>
</template>

<script setup lang="ts">
import type { ProductCardView } from '../utils/public-content-view-types'
import { getProductViewTransitionStyle, type ProductViewTransitionPart } from '../utils/product-view-transition'

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
const { active_product_id, activate } = useActiveViewTransitionProduct()

// 只有 active 商品的卡片掛 view-transition-name：列表靜止時 77 卡 × 6 part 全掛，每次換頁瀏覽器都得逐個拍快照，
// 是換頁慢的主因（045）。非 active 回 undefined 而非空物件，讓 Vue 不輸出 style 屬性。
function getActiveViewTransitionStyle(part: ProductViewTransitionPart) {
  if (props.product.id !== active_product_id.value) {
    return undefined
  }

  return getProductViewTransitionStyle(props.product.id, part)
}

// 用根元素的 capture 階段 click 啟用：它一定跑在 NuxtLink 自己的 click handler（bubble 階段、觸發 router.push）之前，
// 而 reactive 更新在 microtask flush，早於 View Transition 拍 old 快照；鍵盤 Enter 觸發的 <a> 合成 click
// 也走同一路徑，滑鼠與鍵盤一次覆蓋，不必另掛 pointerdown＋keydown。
// 只有通往詳情頁的連結才啟用：channel pill 導向 /channel/*（列表↔列表），若也啟用，該卡會在兩個列表間
// 單獨 morph、其他卡隨 root fade，與 045 接受的「列表↔列表隨 root fade」不一致。
function onCardClicked(event: MouseEvent) {
  // 與 RouterLink 的 guardEvent 同條件：這些點擊（開新分頁／新視窗／下載、或已被 preventDefault）
  // 不會在本分頁導航，來源分頁仍停在列表；照樣啟用會留下 6 個殘名，下次列表↔列表換頁就單獨 morph。
  if (event.defaultPrevented || event.button !== 0
    || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
    return
  }

  const target = event.target as HTMLElement | null

  if (!target?.closest('.product-card-link')) {
    return
  }

  activate(props.product.id)
}

onMounted(() => {
  // SSR／快取已載入即失敗的圖，其 <img @error> 掛載後不會再觸發，掛載時補掃一次。
  scanForBrokenImage(image_tile.value, '.product-image', props.product.id)
})
</script>
