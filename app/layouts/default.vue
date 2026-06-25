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
import { resolveBreadcrumbItems } from '../utils/breadcrumb/resolve-breadcrumb-items'

const route = useRoute()
const catalog_shell_data = await useCatalogShellData()

const current_breadcrumb_items = computed(() =>
  resolveBreadcrumbItems(route.path, route.query, catalog_shell_data.value),
)
</script>
