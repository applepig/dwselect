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
            >DW嚴選</NuxtLink><template v-if="current_breadcrumb_label">
              <span
                class="breadcrumb-separator"
                aria-hidden="true"
              >&gt;</span><span>{{ current_breadcrumb_label }}</span>
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

const current_breadcrumb_label = computed(() => {
  if (route.path === '/') {
    return active_home_category_label.value
  }

  if (route.path === '/guide') {
    return '指南'
  }

  if (route.path === '/links') {
    return '連結'
  }

  if (route.path === '/search') {
    return '搜尋'
  }

  return null
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
</script>
