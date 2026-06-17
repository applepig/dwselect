<template>
  <main class="compact-app-shell">
    <AppNavigation />

    <section class="compact-main">
      <header class="compact-top-bar">
        <div class="top-bar-copy">
          <p class="top-bar-kicker">
            DW SELECT
          </p>
          <h1 class="top-bar-title">
            <NuxtLink
              to="/"
              class="breadcrumb-link"
            >DW嚴選</NuxtLink><template
              v-for="item in current_breadcrumb_items"
              :key="`${item.label}-${item.to === undefined ? 'current' : 'link'}`"
            >
              <span
                class="breadcrumb-separator"
                aria-hidden="true"
              >&gt;</span><NuxtLink
                v-if="item.to"
                :to="item.to"
                class="breadcrumb-link"
              >{{ item.label }}</NuxtLink><span v-else>{{ item.label }}</span>
            </template>
          </h1>
        </div>

        <div class="top-bar-actions">
          <ThemeToggle />
        </div>
      </header>

      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
import type { CategoryChipView } from '../utils/public-content-view-types'

type BreadcrumbItem = {
  label: string
  to?: string | { path: string, query?: Record<string, string> }
}

const route = useRoute()
const catalog_shell_data = await useCatalogShellData()

const active_home_category_label = computed(() => {
  const category_id = getActiveHomeCategoryId()

  if (category_id === null) {
    return null
  }

  const category_item = catalog_shell_data.value?.desktop_category_items.find((item) => item.id === category_id)

  return category_item?.label ?? null
})

const current_breadcrumb_items = computed<BreadcrumbItem[]>(() => {
  if (route.path === '/') {
    return active_home_category_label.value === null ? [] : [{ label: active_home_category_label.value }]
  }

  if (route.path === '/guide') {
    return [{ label: '指南' }]
  }

  if (route.path === '/links') {
    return [{ label: '連結' }]
  }

  if (route.path === '/search') {
    return [{ label: '搜尋' }]
  }

  if (route.path.startsWith('/products/')) {
    const product_id = getRouteProductId()
    const product_item = product_id === null
      ? undefined
      : catalog_shell_data.value?.product_breadcrumb_items_by_id[product_id]

    if (product_item === undefined) {
      return [{ label: '商品詳情' }]
    }

    return [
      {
        label: product_item.category_label,
        to: { path: '/', query: { category: product_item.category_id } },
      },
      { label: product_item.name },
    ]
  }

  return []
})

function getActiveHomeCategoryId(): Exclude<CategoryChipView['id'], 'all'> | null {
  if (route.path !== '/') {
    return null
  }

  const category_query = route.query.category

  if (typeof category_query !== 'string' || category_query === '' || category_query === 'all') {
    return null
  }

  const category_item = catalog_shell_data.value?.desktop_category_items.find((item) => item.id === category_query)

  if (category_item === undefined || category_item.id === 'all') {
    return null
  }

  return category_item.id
}

function getRouteProductId() {
  const route_product_id = route.params.id

  if (Array.isArray(route_product_id)) {
    return route_product_id[0] ?? null
  }

  return typeof route_product_id === 'string' ? route_product_id : null
}
</script>
