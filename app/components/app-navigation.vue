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
          :to="category.id === 'all' ? '/' : `/category/${category.id}`"
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
import type { CategoryChipView } from '../utils/public-content-view-types'

const route = useRoute()
const catalog_shell_data = await useCatalogShellData()
const nav_items = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house', to: '/' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags', to: '/guide' },
  { id: 'links', label: '連結', icon: 'i-lucide-link', to: '/links' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search', to: '/search' },
]
const desktop_route_items = nav_items.filter((item) => item.id !== 'home')
const desktop_category_items = computed(() => catalog_shell_data.value?.desktop_category_items ?? [])

function isRouteActive(path: string) {
  return route.path === path
}

function isCategoryActive(category_id: CategoryChipView['id']) {
  if (category_id === 'all') {
    return route.path === '/'
  }

  return route.path === `/category/${category_id}`
}
</script>
