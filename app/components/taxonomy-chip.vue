<template>
  <NuxtLink
    v-if="to"
    class="taxonomy-chip"
    :to="to"
  >
    {{ label }}
  </NuxtLink>
  <span
    v-else
    class="taxonomy-chip"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  to?: string | { path: string, query?: Record<string, string> }
}>()
</script>
