<template>
  <nav
    class="compact-app-nav"
    aria-label="DW嚴選分頁"
  >
    <div class="compact-app-sidebar">
      <p class="nav-brand">
        DW嚴選
      </p>
      <div class="desktop-category-items">
        <NuxtLink
          v-for="category in desktop_category_items"
          :key="`sidebar-category-${category.id}`"
          :to="category.id === 'all' ? '/' : `/?category=${category.id}`"
          class="app-nav-button desktop-category-link"
          :class="{ 'is-active': isCategoryActive(category.id) }"
          :aria-current="isCategoryActive(category.id) ? 'page' : undefined"
        >
          <span>{{ category.label }}</span>
          <span class="nav-count">{{ category.count }}</span>
        </NuxtLink>
      </div>

      <div class="nav-items desktop-route-items">
        <NuxtLink
          v-for="item in desktop_route_items"
          :key="`sidebar-route-${item.id}`"
          :to="item.to"
          class="app-nav-button"
          :class="{ 'is-active': isRouteActive(item.to) }"
          :aria-current="isRouteActive(item.to) ? 'page' : undefined"
        >
          <UIcon
            :name="item.icon"
            class="app-nav-icon"
          />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="compact-app-rail">
      <NuxtLink
        v-for="item in nav_items"
        :key="`rail-${item.id}`"
        :to="item.to"
        class="app-nav-button"
        :class="{ 'is-active': isRouteActive(item.to) }"
        :aria-label="item.label"
        :aria-current="isRouteActive(item.to) ? 'page' : undefined"
      >
        <UIcon
          :name="item.icon"
          class="app-nav-icon"
        />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>

    <div class="compact-app-bottom-tabs">
      <NuxtLink
        v-for="item in nav_items"
        :key="`bottom-${item.id}`"
        :to="item.to"
        class="app-nav-button"
        :class="{ 'is-active': isRouteActive(item.to) }"
        :aria-current="isRouteActive(item.to) ? 'page' : undefined"
      >
        <UIcon
          :name="item.icon"
          class="app-nav-icon"
        />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { CompactCategoryChip } from '../utils/published-products'
import { getCompactCategoryOptions } from '../utils/published-products'

const route = useRoute()
const { all_products, runtime_taxonomies } = await useCatalogData()
const category_ids = computed(() => new Set(runtime_taxonomies.value?.categories.map((category) => category.id) ?? []))
const nav_items = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house', to: '/' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags', to: '/guide' },
  { id: 'links', label: '連結', icon: 'i-lucide-link', to: '/links' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search', to: '/search' },
]
const desktop_route_items = nav_items.filter((item) => item.id !== 'home')
const desktop_category_items = computed(() => getCompactCategoryOptions(
  all_products.value,
  getActiveCategoryId(),
  runtime_taxonomies.value,
))

function isRouteActive(path: string) {
  return route.path === path
}

function isCategoryActive(category_id: CompactCategoryChip['id']) {
  if (route.path !== '/') {
    return false
  }

  return getActiveCategoryId() === category_id
}

function getActiveCategoryId(): CompactCategoryChip['id'] {
  const active_category = typeof route.query.category === 'string' ? route.query.category : 'all'

  if (active_category === '' || active_category === 'all') {
    return 'all'
  }

  const category_id = active_category as Exclude<CompactCategoryChip['id'], 'all'>

  if (!category_ids.value.has(category_id)) {
    return 'all'
  }

  return category_id
}
</script>
