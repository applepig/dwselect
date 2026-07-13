<template>
  <div class="compact-page">
    <CategoryChipBar />

    <section
      class="compact-panel"
      aria-label="首頁"
    >
      <div
        class="home-results"
      >
        <UEmpty
          v-if="compact_view.home.empty_reason"
          icon="i-lucide-package-open"
          title="目前沒有已上架商品"
        />

        <div
          v-else
          class="product-grid"
        >
          <ProductCard
            v-for="(product, index) in compact_view.home.products"
            :key="product.id"
            :product="product"
            :eager="index < FIRST_SCREEN_EAGER_COUNT"
            :high_priority="index < FIRST_SCREEN_HIGH_PRIORITY_COUNT"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getCompactAppView } from '../utils/published-products/compact-app'
import { getCanonicalUrl, SITE_DESCRIPTION, SITE_OG_IMAGE, SITE_TITLE } from '../utils/seo-metadata'
import { SITE_NAME } from '../utils/site-name'

// 首屏可視卡數：.product-grid 在 iPad 直式（834px 寬）為 2 欄——rail 96 + panel padding 114
// 使 container = 624px，minmax(220px,1fr) 要 viewport ≥894px 才 3 欄（M3a 實測 306px 格寬即 2 欄）。
// 2 欄下首屏約可視 3 列 → 前 6 張設 eager，讓 LCP 候選卡圖不被 lazy 延後；第 7 張起維持 lazy。
// 窄螢幕（1–2 欄）時 6 張涵蓋更多列、寬螢幕多欄時涵蓋約 1.5 列，皆屬合理首屏範圍。
const FIRST_SCREEN_EAGER_COUNT = 6

// 僅首張卡設 fetchpriority=high：各版型的首列首格恆為 LCP 候選，單張 high 讓 preload scanner
// 優先抓 LCP 圖；其餘 eager 卡維持預設優先序，避免多張 high 與 LCP 圖及 render-blocking 資源
// 搶頻寬（慢速行動網路下反而推遲 LCP，web.dev fetchpriority 反模式）。
const FIRST_SCREEN_HIGH_PRIORITY_COUNT = 1

const home_canonical_url = getCanonicalUrl('/')

useHead({
  link: [
    {
      key: 'canonical',
      rel: 'canonical',
      href: home_canonical_url,
    },
  ],
})

useSeoMeta({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  ogTitle: SITE_NAME,
  ogDescription: SITE_DESCRIPTION,
  ogUrl: home_canonical_url,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: SITE_NAME,
  twitterDescription: SITE_DESCRIPTION,
  twitterImage: SITE_OG_IMAGE,
})

const { content_payload } = await useCatalogData()

const compact_view = computed(() => {
  if (content_payload.value === null || content_payload.value === undefined) {
    throw new Error('Catalog runtime data is not available')
  }

  return getCompactAppView(content_payload.value)
})
</script>
