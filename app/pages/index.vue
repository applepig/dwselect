<template>
  <main class="compact-app-shell">
    <AppNavigation
      :tabs="compact_view.tabs"
      :select-tab="setActiveTab"
    />

    <section class="compact-main">
      <header class="compact-top-bar">
        <div class="top-bar-copy">
          <p class="top-bar-kicker">
            DW SELECT
          </p>
          <h1 class="top-bar-title">
            DW嚴選
          </h1>
        </div>

        <div class="top-bar-actions">
          <p class="product-count">
            {{ compact_view.counts.published }} 件
          </p>
          <ThemeToggle />
        </div>
      </header>

      <section
        v-if="active_tab === 'home'"
        class="compact-panel"
        aria-label="首頁"
      >
        <div class="section-heading-row">
          <div>
            <p class="section-kicker">
              Home
            </p>
            <h2 class="section-title">
              最近值得看
            </h2>
          </div>
        </div>

        <div
          class="category-chip-list"
          aria-label="商品分類"
        >
          <button
            v-for="chip in compact_view.home.category_chips"
            :key="chip.id"
            type="button"
            class="category-chip"
            :class="{ 'is-active': chip.active }"
            :aria-pressed="chip.active"
            @click="home_category_id = chip.id"
          >
            <span>{{ chip.label }}</span>
            <span class="chip-count">{{ chip.count }}</span>
          </button>
        </div>

        <div
          v-if="compact_view.home.empty_reason"
          class="compact-empty-state"
        >
          <p class="empty-title">
            目前沒有已上架商品
          </p>
        </div>

        <div
          v-else
          class="product-grid"
        >
          <ProductCard
            v-for="product in compact_view.home.products"
            :key="product.id"
            :product="product"
            @select="onProductSelected"
          />
        </div>
      </section>

      <section
        v-if="active_tab === 'guide'"
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
          @clear-tags="selected_tags = []"
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
            @click="selected_tags = []"
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
            @select="onProductSelected"
          />
        </div>
      </section>

      <section
        v-if="active_tab === 'search'"
        class="compact-panel"
        aria-label="搜尋"
      >
        <div class="section-heading-row">
          <div>
            <p class="section-kicker">
              Search
            </p>
            <h2 class="section-title">
              搜看看
            </h2>
          </div>
        </div>

        <UInput
          v-model="search_query"
          class="search-input"
          placeholder="在找什麼嗎？™"
          icon="i-lucide-search"
          size="xl"
          autocomplete="off"
        />

        <div
          v-if="compact_view.search.empty_reason === 'empty-query'"
          class="search-empty-panel"
        >
          <p class="empty-title">
            熱門 tag
          </p>
          <div class="tag-chip-list">
            <button
              v-for="tag in compact_view.top_tags.slice(0, 10)"
              :key="`search-tag-${tag.label}`"
              type="button"
              class="tag-chip"
              @click="search_query = tag.label"
            >
              <span>{{ tag.label }}</span>
              <span class="tag-count">{{ tag.count }}</span>
            </button>
          </div>
        </div>

        <div
          v-else-if="compact_view.search.empty_reason === 'no-results'"
          class="compact-empty-state"
        >
          <p class="empty-title">
            沒這個坑，去許願吧
          </p>
        </div>

        <div
          v-else
          class="product-grid"
        >
          <ProductCard
            v-for="product in compact_view.search.products"
            :key="product.id"
            :product="product"
            @select="onProductSelected"
          />
        </div>
      </section>

      <section
        v-if="active_tab === 'links'"
        class="compact-panel"
        aria-label="連結"
      >
        <div class="section-heading-row">
          <div>
            <p class="section-kicker">
              Links
            </p>
            <h2 class="section-title">
              相關入口
            </h2>
          </div>
        </div>

        <LinkPanel :links="compact_view.links" />
      </section>
    </section>
  </main>

  <ProductDetail
    v-model:open="detail_open"
    :detail="selected_product_detail"
    :fullscreen="is_phone_detail"
  />
</template>

<script setup lang="ts">
import type { CompactAppTabId, CompactCategoryChip, TaxonomyDefinitions } from '../utils/published-products'
import type { CategoryDefinition, ChannelDefinition, LinkDefinition, Product } from '../utils/product-schema'
import { getCatalogProductId, getCompactAppView, getProductDetail } from '../utils/published-products'
import { getClientSearchResults } from '../utils/search/client-search'
import { runViewTransition } from '../utils/view-transition'

const { data: products } = await useAsyncData('published-products', () => queryCollection('products')
  .where('status', '=', 'published')
  .order('category_id', 'ASC')
  .order('published_at', 'DESC')
  .order('name', 'ASC')
  .all())
const { data: category_taxonomy } = await useAsyncData('taxonomy-categories', () => queryCollection('categories').first())
const { data: channel_taxonomy } = await useAsyncData('taxonomy-channels', () => queryCollection('channels').first())
const { data: link_taxonomy } = await useAsyncData('taxonomy-links', () => queryCollection('links').first())

const active_tab = ref<CompactAppTabId>('home')
const home_category_id = ref<CompactCategoryChip['id']>('all')
const selected_tags = ref<string[]>([])
const selected_product_id = ref<string | null>(null)
const search_query = ref('')
const client_search_result_ids = ref<string[] | null>(null)
const is_phone_detail = ref(false)

const all_products = computed(() => (products.value ?? []) as Product[])
const runtime_taxonomies = computed<TaxonomyDefinitions | undefined>(() => {
  const categories = category_taxonomy.value?.items as CategoryDefinition[] | undefined
  const channels = channel_taxonomy.value?.items as ChannelDefinition[] | undefined

  if (categories === undefined || channels === undefined) {
    return undefined
  }

  return { categories, channels }
})
const runtime_links = computed<LinkDefinition[] | undefined>(() => link_taxonomy.value?.items as LinkDefinition[] | undefined)
const compact_view = computed(() => getCompactAppView(all_products.value, {
  active_tab: active_tab.value,
  home_category_id: home_category_id.value,
  selected_tags: selected_tags.value,
  search_query: search_query.value,
  search_result_ids: client_search_result_ids.value,
}, runtime_taxonomies.value, runtime_links.value))
const selected_product = computed(() => all_products.value.find((product) => getCatalogProductId(product) === selected_product_id.value) ?? null)
const selected_product_detail = computed(() => selected_product.value ? getProductDetail(selected_product.value, runtime_taxonomies.value) : null)
const detail_open = computed({
  get: () => selected_product_detail.value !== null,
  set: (open: boolean) => {
    if (!open) {
      closeProductDetail()
    }
  },
})

let phone_media_query: MediaQueryList | null = null
let search_request_id = 0

function toggleTag(tag: string) {
  if (selected_tags.value.includes(tag)) {
    selected_tags.value = selected_tags.value.filter((selected_tag) => selected_tag !== tag)
    return
  }

  selected_tags.value = [...selected_tags.value, tag]
}

function setActiveTab(tab_id: CompactAppTabId) {
  active_tab.value = tab_id
}

watch(search_query, async (query) => {
  const request_id = search_request_id + 1
  search_request_id = request_id
  const normalized_query = query.trim()

  if (normalized_query === '') {
    client_search_result_ids.value = null
    return
  }

  try {
    const search_results = await getClientSearchResults(normalized_query)

    if (request_id !== search_request_id) {
      return
    }

    client_search_result_ids.value = search_results.map((result) => result.id)
  }
  catch {
    if (request_id !== search_request_id) {
      return
    }

    client_search_result_ids.value = null
  }
})

function onProductSelected(product_id: string) {
  runViewTransition(() => {
    selected_product_id.value = product_id
  })
}

function closeProductDetail() {
  runViewTransition(() => {
    selected_product_id.value = null
  })
}

function updatePhoneDetailState() {
  is_phone_detail.value = phone_media_query?.matches ?? false
}

onMounted(() => {
  phone_media_query = window.matchMedia('(max-width: 767px)')
  updatePhoneDetailState()
  phone_media_query.addEventListener('change', updatePhoneDetailState)
})

onBeforeUnmount(() => {
  phone_media_query?.removeEventListener('change', updatePhoneDetailState)
})
</script>
