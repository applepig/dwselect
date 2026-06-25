<template>
  <article
    ref="detail_root"
    class="product-detail-page"
    :data-product-id="detail.id"
  >
    <section class="detail-content">
      <div class="detail-hero-layout">
        <div
          class="detail-hero-tile"
          :style="{ 'view-transition-name': `product-image-${detail.id}` }"
        >
          <UButton
            class="detail-back"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="返回"
            @click="onBackClicked"
          />

          <NuxtImg
            v-if="!has_detail_image_failed"
            :src="detail.hero_image_url"
            :alt="detail.hero_alt"
            class="detail-hero-image"
            format="webp"
            @error="onDetailImageError"
          />
          <UIcon
            name="i-lucide-image-off"
            class="detail-image-fallback-icon"
            aria-hidden="true"
          />
        </div>

        <div class="detail-summary-column">
          <h2 class="detail-title">
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

          <p class="detail-price">
            {{ detail.price_label }}
          </p>

          <UAlert
            class="detail-dw-says"
            color="primary"
            variant="subtle"
            title="DW 怎麼說"
            :description="detail.long_description || detail.summary"
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
    </section>

    <section
      v-if="displayed_related_products.length > 0"
      class="related-products-section"
      aria-label="You may also like"
    >
      <h3 class="related-products-title">
        You may also like
      </h3>

      <div class="related-products-grid">
        <NuxtLink
          v-for="product in displayed_related_products"
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
import type { ProductDetailView } from '../utils/public-content-view-types'

const router = useRouter()

const props = defineProps<{
  detail: ProductDetailView
}>()

const has_detail_image_failed = ref(false)
const failed_related_image_ids = ref<Set<string>>(new Set())
const detail_root = ref<HTMLElement | null>(null)
const displayed_related_products = computed(() => props.detail.related_products)
// tag_ids 與 tag_labels 為並列陣列、由 mapper 同源同序映射（tag_ids.map(...)），故以 index 配對安全。
// 配對後 pill 能同時顯示 label 又精準連到對應 tag id。
const detail_tags = computed(() => props.detail.tag_ids.map((id, index) => ({
  id,
  label: props.detail.tag_labels[index] ?? id,
})))
// brand pill 深連 /brand/{id}（專屬前綴、單一 canonical，ADR-8）；brand_ids／brand_labels 同源同序。
const detail_brands = computed(() => props.detail.brand_ids.map((id, index) => ({
  id,
  label: props.detail.brand_labels[index] ?? id,
})))

onMounted(() => {
  const hero_image = detail_root.value?.querySelector<HTMLImageElement>('.detail-hero-image') ?? null

  if (isBrokenImage(hero_image)) {
    onDetailImageError()
  }

  const related_images = detail_root.value?.querySelectorAll<HTMLImageElement>('.related-product-image') ?? []

  for (const image of related_images) {
    const product_id = image.dataset.productId

    if (product_id && isBrokenImage(image)) {
      onRelatedImageError(product_id)
    }
  }
})

function onDetailImageError() {
  has_detail_image_failed.value = true
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

  router.push('/')
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
