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

      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
import { getCompactAppView } from '../utils/published-products'

const { all_products, runtime_taxonomies, runtime_links } = await useCatalogData()
const compact_view = computed(() => getCompactAppView(
  all_products.value,
  {},
  runtime_taxonomies.value,
  runtime_links.value,
))
</script>
