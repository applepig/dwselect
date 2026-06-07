<template>
  <main class="catalog-page">
    <div class="catalog-shell">
      <header class="catalog-hero">
        <div>
          <p class="catalog-kicker">
            DW SELECT
          </p>
          <h1 class="catalog-title">
            DW嚴選
          </h1>
          <p class="catalog-description">
            精選已上架商品。用分類、搜尋與排序快速找到適合的選物。
          </p>
        </div>

        <p class="catalog-summary">
          目前收錄 {{ catalog_view.counts.published }} 件商品，顯示 {{ catalog_view.counts.filtered }} 件。
        </p>
      </header>

      <section
        class="catalog-toolbar"
        aria-label="商品搜尋與篩選"
      >
        <div class="catalog-search-wrap">
          <UInputMenu
            v-model:search-term="search_query"
            :items="search_menu_items"
            :ignore-filter="true"
            :loading="search_status === 'loading'"
            :open-on-focus="true"
            :reset-search-term-on-blur="false"
            :reset-search-term-on-select="false"
            mode="autocomplete"
            label-key="label"
            description-key="description"
            value-key="label"
            class="catalog-search"
            placeholder="搜尋商品、分類或 tag"
            trailing-icon="i-lucide-search"
            clear
          >
            <template #empty>
              <span>{{ search_empty_label }}</span>
            </template>
          </UInputMenu>

          <p
            class="catalog-search-status"
            role="status"
            aria-live="polite"
          >
            {{ search_note }}
          </p>
        </div>

        <div class="catalog-controls">
          <div
            class="category-tabs"
            aria-label="商品分類"
          >
            <button
              v-for="option in catalog_view.category_options"
              :key="`category-option-${option.value}`"
              type="button"
              class="category-tab"
              :aria-pressed="option.active"
              @click="selected_category = option.value"
            >
              {{ option.label }}
              <span class="category-count">{{ option.count }}</span>
            </button>
          </div>

          <label class="sort-field">
            <span class="sort-label">排序</span>
            <select
              v-model="selected_sort"
              class="sort-select"
            >
              <option
                v-for="option in catalog_view.sort_options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
      </section>

      <section
        v-if="catalog_view.empty_reason"
        class="empty-state"
        aria-live="polite"
      >
        <p class="empty-title">
          {{ empty_state.title }}
        </p>
        <p class="empty-description">
          {{ empty_state.description }}
        </p>
        <button
          v-if="catalog_view.empty_reason === 'no-results'"
          type="button"
          class="clear-search-button"
          @click="clearSearch"
        >
          清除搜尋
        </button>
      </section>

      <div
        v-else
        class="product-sections"
      >
        <section
          v-for="group in catalog_view.sections"
          :key="`product-section-${group.category}`"
          class="product-section"
        >
          <h2 class="section-heading">
            {{ group.category }}
          </h2>

          <ul class="product-grid">
            <li
              v-for="product in group.products"
              :key="`product-card-${product.id}`"
              class="product-card"
              :data-product-id="product.id"
            >
              <img
                :key="`product-image-${product.id}-${product.image}`"
                :src="product.image"
                :alt="product.name"
                class="product-image"
                loading="lazy"
              >

              <div class="product-body">
                <div class="product-meta">
                  <span>{{ product.category }}</span>
                  <span>{{ formatPublishedDate(product.published_at) }}</span>
                </div>

                <h3 class="product-name">
                  {{ product.name }}
                </h3>
                <p class="product-description">
                  {{ product.description }}
                </p>
                <p class="product-price">
                  {{ product.price }}
                </p>

                <ul class="product-tags">
                  <li
                    v-for="tag in product.tags"
                    :key="`${product.id}-${tag}`"
                    class="product-tag"
                  >
                    {{ tag }}
                  </li>
                </ul>

                <a
                  :href="product.purchase_link"
                  class="purchase-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  前往購買
                </a>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { CatalogSort, CatalogView } from '../utils/published-products'
import type { Product } from '../utils/product-schema'
import type { SearchSuggestion } from '../utils/search/search-index'
import { formatPublishedDate } from '../utils/format-published-date'
import { getCatalogSearchProducts, getCatalogView } from '../utils/published-products'

type SearchMenuItem = {
  id: string
  label: string
  description: string
}

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error'

const { data: products } = await useAsyncData('published-products', () => queryCollection('products')
  .where('status', '=', 'published')
  .order('category', 'ASC')
  .order('published_at', 'DESC')
  .order('name', 'ASC')
  .all())

const selected_category = ref('全部')
const selected_sort = ref<CatalogSort>('default')
const search_query = ref('')
const search_results = ref<SearchSuggestion[]>([])
const search_suggestions = ref<SearchSuggestion[]>([])
const search_status = ref<SearchStatus>('idle')
let search_request_id = 0

const all_products = computed(() => (products.value ?? []) as Product[])
const normalized_search_query = computed(() => search_query.value.trim())
const category_view = computed(() => getCatalogView(all_products.value, {
  category: selected_category.value,
  sort: selected_sort.value,
}))
const products_for_catalog = computed(() => {
  if (normalized_search_query.value === '' || search_status.value !== 'ready') {
    return all_products.value
  }

  return getCatalogSearchProducts(all_products.value, search_results.value, normalized_search_query.value)
})
const catalog_view = computed<CatalogView>(() => {
  const view = getCatalogView(products_for_catalog.value, {
    category: selected_category.value,
    sort: selected_sort.value,
  })

  return {
    ...view,
    category_options: category_view.value.category_options,
    sort_options: category_view.value.sort_options,
    query: normalized_search_query.value,
    counts: {
      published: category_view.value.counts.published,
      filtered: view.counts.filtered,
    },
    empty_reason: getCatalogEmptyReason(view),
  }
})
const search_menu_items = computed<SearchMenuItem[]>(() => search_suggestions.value.map((suggestion) => ({
  id: suggestion.id,
  label: suggestion.label,
  description: `${suggestion.category}・${suggestion.price_text}`,
})))
const search_empty_label = computed(() => {
  if (search_status.value === 'loading') {
    return '搜尋中'
  }

  if (search_status.value === 'error') {
    return '搜尋暫時無法載入'
  }

  if (normalized_search_query.value === '') {
    return '輸入關鍵字搜尋'
  }

  return '沒有符合的建議'
})
const search_note = computed(() => {
  if (search_status.value === 'loading') {
    return '搜尋 index 載入中，稍候會顯示建議。'
  }

  if (search_status.value === 'error') {
    return '搜尋 index 載入失敗，仍可用分類與排序瀏覽商品。'
  }

  if (normalized_search_query.value === '') {
    return '可搜尋商品名稱、描述、分類與 tag。'
  }

  if (search_suggestions.value.length === 0) {
    return 'MiniSearch 沒有找到建議。'
  }

  return `MiniSearch 找到 ${search_suggestions.value.length} 筆建議。`
})
const empty_state = computed(() => {
  if (catalog_view.value.empty_reason === 'no-products') {
    return {
      title: '目前沒有已上架商品',
      description: '商品資料會在內容更新並重新 generate 後出現在這裡。',
    }
  }

  return {
    title: '找不到符合條件的商品',
    description: '請調整搜尋文字、分類或排序條件。',
  }
})

watch(search_query, async (query) => {
  const request_id = ++search_request_id
  const normalized_query = query.trim()

  if (normalized_query === '') {
    search_status.value = 'idle'
    search_results.value = []
    search_suggestions.value = []

    return
  }

  search_status.value = 'loading'
  search_results.value = []
  search_suggestions.value = []

  try {
    const { getClientSearchResults } = await import('../utils/search/client-search')
    const results = await getClientSearchResults(normalized_query)

    if (request_id !== search_request_id) {
      return
    }

    search_results.value = results
    search_suggestions.value = results.slice(0, 12)
    search_status.value = 'ready'
  }
  catch {
    if (request_id !== search_request_id) {
      return
    }

    search_results.value = []
    search_suggestions.value = []
    search_status.value = 'error'
  }
})

function getCatalogEmptyReason(view: CatalogView): CatalogView['empty_reason'] {
  if (category_view.value.counts.published === 0) {
    return 'no-products'
  }

  if (view.products.length === 0) {
    return 'no-results'
  }

  return null
}

function clearSearch() {
  search_query.value = ''
}

</script>
