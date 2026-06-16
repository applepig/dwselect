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
const catalog_shell_data = await useCatalogShellData()
const compact_view = computed(() => {
  if (catalog_shell_data.value === null || catalog_shell_data.value === undefined) {
    throw new Error('Catalog shell data is not available')
  }

  return catalog_shell_data.value
})
</script>
