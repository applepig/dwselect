<template>
  <section
    class="compact-panel"
    aria-label="指南"
  >
    <div class="section-heading-row">
      <div>
        <p class="section-kicker">
          Guide
        </p>
        <h2 class="section-title">
          用 tag 找坑
        </h2>
      </div>
    </div>

    <TagExplorer
      :tags="compact_view.guide.tag_chips"
      :selected_tags="compact_view.guide.selected_tags"
      :can_clear="compact_view.guide.can_clear_tags"
      @toggle-tag="toggleTag"
      @clear-tags="setSelectedTags([])"
    />

    <div
      v-if="compact_view.guide.empty_reason === 'no-results'"
      class="compact-empty-state"
    >
      <p class="empty-title">
        這組 tag 暫時沒東西
      </p>
      <button
        type="button"
        class="clear-tags-button"
        @click="setSelectedTags([])"
      >
        清除已選 tag
      </button>
    </div>

    <div
      v-else
      class="product-grid"
    >
      <ProductCard
        v-for="product in compact_view.guide.products"
        :key="product.id"
        :product="product"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { getCompactAppStateFromRoute, getCompactAppView, getPublishedProducts } from '../utils/published-products'

const route = useRoute()
const router = useRouter()
const { all_products, runtime_taxonomies, runtime_links } = await useCatalogData()
const tag_labels = computed(() => Array.from(new Set(getPublishedProducts(
  all_products.value,
  runtime_taxonomies.value,
).flatMap((product) => product.tags))))
const route_state = computed(() => getCompactAppStateFromRoute(
  { path: route.path, query: route.query },
  { tag_labels: tag_labels.value },
))
const compact_view = computed(() => getCompactAppView(
  all_products.value,
  route_state.value,
  runtime_taxonomies.value,
  runtime_links.value,
))

function toggleTag(tag: string) {
  const selected_tags = compact_view.value.guide.selected_tags

  if (selected_tags.includes(tag)) {
    setSelectedTags(selected_tags.filter((selected_tag) => selected_tag !== tag))
    return
  }

  setSelectedTags([...selected_tags, tag])
}

function setSelectedTags(tags: string[]) {
  router.push({
    path: '/guide',
    // Why: 傳 array 讓 Vue Router 輸出重複 param（?tags=a&tags=b），避免逗號分隔符
    // 與含逗號的 tag label 碰撞。
    query: tags.length === 0 ? {} : { tags },
  })
}
</script>
