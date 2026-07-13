<template>
  <NuxtLink
    v-if="to"
    class="catalog-pill"
    :class="`catalog-pill--${variant}`"
    :to="to"
  >
    <slot />
  </NuxtLink>
  <span
    v-else
    class="catalog-pill"
    :class="`catalog-pill--${variant}`"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  to?: string | { path: string, query?: Record<string, string> }
  variant?: 'default' | 'price'
}>(), {
  variant: 'default',
})
</script>
