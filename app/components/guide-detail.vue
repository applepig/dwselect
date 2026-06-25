<template>
  <article
    ref="detail_root"
    class="product-detail-page"
    :data-guide-id="detail.id"
  >
    <section class="detail-content">
      <div class="detail-hero-layout">
        <div class="detail-hero-tile">
          <UButton
            class="detail-back"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="返回"
            @click="onBackClicked"
          />

          <NuxtImg
            v-if="has_hero_image"
            :src="detail.hero_image_url"
            :alt="detail.hero_alt"
            class="detail-hero-image"
            format="webp"
            @error="onHeroImageError"
          />
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

    <section
      v-if="detail.related_products.length > 0"
      class="related-products-section"
      aria-label="相關商品"
    >
      <h3 class="related-products-title">
        相關商品
      </h3>

      <div class="related-products-grid">
        <NuxtLink
          v-for="product in detail.related_products"
          :key="product.id"
          :to="`/products/${product.id}`"
          class="related-product-card"
          :aria-label="`查看 ${product.name} 詳情`"
        >
          <span class="related-product-image-tile">
            <NuxtImg
              v-if="!failed_related_image_ids.has(product.id)"
              :src="product.image_url"
              :alt="product.name"
              class="related-product-image"
              :data-product-id="product.id"
              loading="lazy"
              format="webp"
              @error="onRelatedImageError(product.id)"
            />
            <UIcon
              name="i-lucide-image-off"
              class="related-product-fallback-icon"
              aria-hidden="true"
            />
          </span>

          <span class="related-product-body">
            <span class="related-product-name">{{ product.name }}</span>
            <span class="related-product-meta">{{ product.category_label }} · {{ product.channel_label }}</span>
          </span>
        </NuxtLink>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GuideDetailView } from '../utils/public-content-view-types'

const router = useRouter()

const props = defineProps<{
  detail: GuideDetailView
}>()

const has_hero_image_failed = ref(false)
const failed_related_image_ids = ref<Set<string>>(new Set())
const detail_root = ref<HTMLElement | null>(null)
const has_hero_image = computed(() => props.detail.hero_image_url !== '' && !has_hero_image_failed.value)
// category_ids／category_labels（及 tag 同理）為並列陣列，由 mapper 同源同序映射（*_ids.map(...)），
// 故以 index 配對安全；配對後 pill 能顯示 label 又精準連到對應 taxonomy id。
const detail_categories = computed(() => props.detail.category_ids.map((id, index) => ({
  id,
  label: props.detail.category_labels[index] ?? id,
})))
const detail_tags = computed(() => props.detail.tag_ids.map((id, index) => ({
  id,
  label: props.detail.tag_labels[index] ?? id,
})))
// brand pill 深連 /brand/{id}（ADR-8）；brand_ids／brand_labels 同源同序。
const detail_brands = computed(() => props.detail.brand_ids.map((id, index) => ({
  id,
  label: props.detail.brand_labels[index] ?? id,
})))

onMounted(() => {
  const hero_image = detail_root.value?.querySelector<HTMLImageElement>('.detail-hero-image') ?? null

  if (isBrokenImage(hero_image)) {
    onHeroImageError()
  }

  const related_images = detail_root.value?.querySelectorAll<HTMLImageElement>('.related-product-image') ?? []

  for (const image of related_images) {
    const product_id = image.dataset.productId

    if (product_id && isBrokenImage(image)) {
      onRelatedImageError(product_id)
    }
  }
})

function onHeroImageError() {
  has_hero_image_failed.value = true
}

function onRelatedImageError(product_id: string) {
  failed_related_image_ids.value = new Set([...failed_related_image_ids.value, product_id])
}

function isBrokenImage(image: HTMLImageElement | null): boolean {
  return image !== null && image.complete && image.naturalWidth === 0
}

function onBackClicked() {
  if (canReturnToSameOriginPage()) {
    router.back()

    return
  }

  router.push('/guide')
}

function canReturnToSameOriginPage(): boolean {
  if (!import.meta.client) {
    return false
  }

  if (window.history.length <= 1) {
    return false
  }

  const previous_route = window.history.state?.back

  if (typeof previous_route === 'string' && previous_route.startsWith('/') && !previous_route.startsWith('//')) {
    return true
  }

  if (document.referrer === '') {
    return false
  }

  try {
    return new URL(document.referrer).origin === window.location.origin
  }
  catch {
    return false
  }
}
</script>
