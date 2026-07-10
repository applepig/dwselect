<template>
  <article
    ref="detail_root"
    class="product-detail-page"
    :data-guide-id="detail.id"
  >
    <span
      class="product-transition-shell"
      aria-hidden="true"
    />

    <section class="detail-content">
      <div class="detail-hero-layout">
        <div class="detail-hero-tile">
          <UButton
            class="detail-back"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="返回"
            @click="goBack"
          />

          <NuxtImg
            v-if="has_hero_image && isLocalImageSource(detail.hero_image_url)"
            :src="detail.hero_image_url"
            :alt="detail.hero_alt"
            class="detail-hero-image"
            format="webp"
            @error="onImageError('hero')"
          />
          <img
            v-else-if="has_hero_image"
            :src="detail.hero_image_url"
            :alt="detail.hero_alt"
            class="detail-hero-image"
            @error="onImageError('hero')"
          >
          <UIcon
            name="i-lucide-image-off"
            class="detail-image-fallback-icon"
            aria-hidden="true"
          />
        </div>

        <div class="detail-summary-column">
          <h2 class="detail-title">
            {{ detail.title }}
          </h2>

          <div
            class="detail-taxonomy-row"
            aria-label="指南分類與 tags"
          >
            <CatalogPill
              v-for="category in detail_categories"
              :key="`category-${category.id}`"
              :to="`/category/${category.id}`"
            >
              {{ category.label }}
            </CatalogPill>
            <CatalogPill
              v-for="brand in detail_brands"
              :key="`brand-${brand.id}`"
              :to="`/brand/${brand.id}`"
            >
              {{ brand.label }}
            </CatalogPill>
            <CatalogPill
              v-for="tag in detail_tags"
              :key="`tag-${tag.id}`"
              :to="`/tag/${tag.id}`"
            >
              {{ tag.label }}
            </CatalogPill>
          </div>

          <a
            class="detail-summary-buy-link"
            :href="detail.source_url"
            target="_blank"
            rel="noopener noreferrer"
          >看原文</a>
        </div>
      </div>

      <section
        class="detail-llm-says"
        aria-labelledby="detail-guide-body-title"
      >
        <h3
          id="detail-guide-body-title"
          class="detail-llm-title"
        >
          內容
        </h3>
        <div class="detail-llm-copy">
          <ContentMarkdown
            v-if="detail.body"
            :source="detail.body"
          />
          <p
            v-else
            class="detail-llm-paragraph"
          >
            {{ detail.summary }}
          </p>
        </div>
      </section>

      <UButton
        class="detail-buy-cta"
        :to="detail.source_url"
        target="_blank"
        rel="noopener noreferrer"
        block
        size="xl"
      >
        看原文
      </UButton>
    </section>

    <ShareButtons :title="detail.title" />

    <DisqusThread
      content-type="guides"
      :content-id="detail.id"
    />

    <RelatedProductsSection
      :products="detail.related_products"
      title="相關商品"
    />
  </article>
</template>

<script setup lang="ts">
import type { GuideDetailView } from '../utils/public-content-view-types'
import { zipTaxonomyPills } from '../utils/content/zip-taxonomy-pills'

const { goBack } = useDetailBackNavigation('/guide')

const props = defineProps<{
  detail: GuideDetailView
}>()

const detail_root = ref<HTMLElement | null>(null)
const { isBrokenImage, onImageError, scanForBrokenImage } = useBrokenImageFallback()
const has_hero_image = computed(() => props.detail.hero_image_url !== '' && !isBrokenImage('hero'))
// category／tag／brand pill：ids 與 labels 為並列陣列，由 mapper 同源同序映射，以 index 配對安全；
// 配對後 pill 能顯示 label 又精準連到對應 taxonomy id。brand pill 深連 /brand/{id}（ADR-8）。
const detail_categories = computed(() => zipTaxonomyPills(props.detail.category_ids, props.detail.category_labels))
const detail_tags = computed(() => zipTaxonomyPills(props.detail.tag_ids, props.detail.tag_labels))
const detail_brands = computed(() => zipTaxonomyPills(props.detail.brand_ids, props.detail.brand_labels))

onMounted(() => {
  scanForBrokenImage(detail_root.value, '.detail-hero-image', 'hero')
})

// 本地 content 圖（/guides/images/...）走 <NuxtImg>／IPX；外部 http guide 圖維持原生 <img>。
// 比照 resource-list.vue 的分流；目前僅兩處用，未達抽共用 util 門檻。
function isLocalImageSource(image_url: string): boolean {
  return image_url.startsWith('/')
}
</script>
