<template>
  <article
    ref="detail_root"
    class="product-detail-page"
    :data-product-id="detail.id"
  >
    <UButton
      class="detail-back"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      aria-label="返回"
      @click="onBackClicked"
    />

    <div
      class="detail-hero-tile"
      :style="{ 'view-transition-name': `product-image-${detail.id}` }"
    >
      <img
        v-if="!has_detail_image_failed"
        :src="detail.hero_image"
        :alt="detail.hero_alt"
        class="detail-hero-image"
        @error="onDetailImageError"
      >
      <UIcon
        name="i-lucide-image-off"
        class="detail-image-fallback-icon"
        aria-hidden="true"
      />
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

      <UAlert
        class="detail-dw-says"
        color="primary"
        variant="subtle"
        title="DW 怎麼說"
        :description="detail.dw_says"
      />

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
        <NuxtLink
          v-for="tag in detail.tags"
          :key="tag"
          class="detail-tag"
          :to="{ path: '/search', query: { q: tag } }"
        >
          {{ tag }}
        </NuxtLink>
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
            <img
              v-if="!failed_related_image_ids.has(product.id)"
              :src="product.image"
              :alt="product.name"
              class="related-product-image"
              :data-product-id="product.id"
              loading="lazy"
              @error="onRelatedImageError(product.id)"
            >
            <UIcon
              name="i-lucide-image-off"
              class="related-product-fallback-icon"
              aria-hidden="true"
            />
          </span>

          <span class="related-product-body">
            <span class="related-product-name">{{ product.name }}</span>
            <span class="related-product-meta">{{ product.category }} · {{ product.channel }}</span>
          </span>
        </NuxtLink>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import type { ProductDetailView } from '../utils/published-products/types'

const router = useRouter()

const props = defineProps<{
  detail: ProductDetailView
}>()

const has_detail_image_failed = ref(false)
const failed_related_image_ids = ref<Set<string>>(new Set())
const detail_root = ref<HTMLElement | null>(null)
const displayed_related_products = computed(() => props.detail.related_products.slice(0, 3))

onMounted(() => {
  const hero_image = detail_root.value?.querySelector<HTMLImageElement>('.detail-hero-image') ?? null

  hero_image?.addEventListener('error', onDetailImageError)

  if (isBrokenImage(hero_image)) {
    onDetailImageError()
  }

  const related_images = detail_root.value?.querySelectorAll<HTMLImageElement>('.related-product-image') ?? []

  for (const image of related_images) {
    const product_id = image.dataset.productId

    if (product_id) {
      image.addEventListener('error', () => onRelatedImageError(product_id))
    }

    if (image.dataset.productId && isBrokenImage(image)) {
      onRelatedImageError(image.dataset.productId)
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
  router.back()
}
</script>
