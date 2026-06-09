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
const route = useRoute()
const { all_products, runtime_taxonomies } = await useCatalogData()
const nav_items = [
  { id: 'home', label: '首頁', icon: 'i-lucide-house', to: '/' },
  { id: 'guide', label: '指南', icon: 'i-lucide-tags', to: '/guide' },
  { id: 'links', label: '連結', icon: 'i-lucide-link', to: '/links' },
  { id: 'search', label: '搜尋', icon: 'i-lucide-search', to: '/search' },
]
const desktop_route_items = nav_items.filter((item) => item.id !== 'home')
const desktop_category_items = computed(() => {
  const published_products = all_products.value.filter((product) => product.status === 'published')
  const category_counts = new Map<string, number>()

  for (const product of published_products) {
    category_counts.set(product.category_id, (category_counts.get(product.category_id) ?? 0) + 1)
  }

  return [
    { id: 'all', label: '全部', count: published_products.length },
    ...(runtime_taxonomies.value?.categories ?? [])
      .filter((category) => category.nav_visible)
      .toSorted((left_category, right_category) => left_category.sort_order - right_category.sort_order)
      .map((category) => ({
        id: category.id,
        label: category.short_label,
        count: category_counts.get(category.id) ?? 0,
      })),
  ]
})

function isRouteActive(path: string) {
  return route.path === path
}

function isCategoryActive(category_id: string) {
  if (route.path !== '/') {
    return false
  }

  const active_category = typeof route.query.category === 'string' ? route.query.category : 'all'

  if (category_id === 'all') {
    return active_category === 'all' || active_category === ''
  }

  return active_category === category_id
}
</script>
