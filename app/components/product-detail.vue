<template>
  <article
    ref="detail_root"
    class="product-detail-page"
    :data-product-id="detail.id"
  >
    <span
      class="product-transition-shell product-vt-card"
      :style="getProductViewTransitionStyle(detail.id, 'card')"
      aria-hidden="true"
    />

    <section class="detail-content">
      <div class="detail-hero-layout">
        <div
          class="detail-hero-tile product-vt-image"
          :style="getProductViewTransitionStyle(detail.id, 'image')"
        >
          <UButton
            class="detail-back"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="返回"
            @click="goBack"
          />

          <NuxtImg
            v-if="!isBrokenImage('hero')"
            :src="detail.hero_image_url"
            :alt="detail.hero_alt"
            class="detail-hero-image"
            format="webp"
            @error="onImageError('hero')"
          />
          <UIcon
            name="i-lucide-image-off"
            class="detail-image-fallback-icon"
            aria-hidden="true"
          />
        </div>

        <div class="detail-summary-column">
          <h2
            class="detail-title product-vt-title"
            :style="getProductViewTransitionStyle(detail.id, 'title')"
          >
            {{ detail.name }}
          </h2>

          <div
            class="detail-taxonomy-row"
            aria-label="商品分類、通路與 tags"
          >
            <CatalogPill
              :to="`/category/${detail.category_id}`"
            >
              {{ detail.category_label }}
            </CatalogPill>
            <CatalogPill
              :to="`/channel/${detail.channel_id}`"
            >
              {{ detail.channel_label }}
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

          <p
            class="detail-price product-vt-price"
            :style="getProductViewTransitionStyle(detail.id, 'price')"
          >
            {{ detail.price_label }}
          </p>

          <UAlert
            class="detail-dw-says product-vt-summary"
            color="primary"
            variant="subtle"
            title="DW 怎麼說"
            :description="detail.long_description || detail.summary"
            :style="getProductViewTransitionStyle(detail.id, 'summary')"
          />

          <a
            class="detail-summary-buy-link"
            :href="detail.buy_url"
            target="_blank"
            rel="noopener noreferrer"
          >去 {{ detail.channel_label }} 逛逛</a>
        </div>
      </div>

      <section
        v-if="detail.llm_description"
        class="detail-llm-says"
        aria-labelledby="detail-llm-says-title"
      >
        <h3
          id="detail-llm-says-title"
          class="detail-llm-title"
        >
          AI 怎麼說
        </h3>
        <div class="detail-llm-copy">
          <ContentMarkdown :source="detail.llm_description" />
        </div>
      </section>

      <UButton
        class="detail-buy-cta"
        :to="detail.buy_url"
        target="_blank"
        rel="noopener noreferrer"
        block
        size="xl"
      >
        去 {{ detail.channel_label }} 逛逛
      </UButton>

      <p class="detail-fine-print">
        {{ detail.fine_print || '價格與庫存以通路頁面為準。' }}
      </p>

      <section
        v-if="detail.reference_links.length > 0"
        class="detail-reference-links"
        aria-labelledby="detail-reference-links-title"
      >
        <h3
          id="detail-reference-links-title"
          class="detail-reference-links-title"
        >
          參考資料
        </h3>

        <ul class="detail-reference-list">
          <li
            v-for="reference_link in detail.reference_links"
            :key="reference_link.url"
            class="detail-reference-item"
          >
            <a
              class="detail-reference-link"
              :href="reference_link.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ reference_link.title }}</a>
          </li>
        </ul>
      </section>
    </section>

    <ShareButtons :title="detail.name" />

    <RelatedProductsSection
      :products="detail.related_products"
      title="You may also like"
    />
  </article>
</template>

<script setup lang="ts">
import type { ProductDetailView } from '../utils/public-content-view-types'
import { zipTaxonomyPills } from '../utils/content/zip-taxonomy-pills'
import { getProductViewTransitionStyle } from '../utils/product-view-transition'

const { goBack } = useDetailBackNavigation('/')

const props = defineProps<{
  detail: ProductDetailView
}>()

const detail_root = ref<HTMLElement | null>(null)
const { isBrokenImage, onImageError, scanForBrokenImage } = useBrokenImageFallback()
// tag／brand pill：ids 與 labels 為並列陣列、由 mapper 同源同序映射，以 index 配對安全；
// 配對後 pill 能同時顯示 label 又精準連到對應 taxonomy id。brand pill 深連 /brand/{id}（ADR-8）。
const detail_tags = computed(() => zipTaxonomyPills(props.detail.tag_ids, props.detail.tag_labels))
const detail_brands = computed(() => zipTaxonomyPills(props.detail.brand_ids, props.detail.brand_labels))

onMounted(() => {
  scanForBrokenImage(detail_root.value, '.detail-hero-image', 'hero')
})
</script>
