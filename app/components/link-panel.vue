<template>
  <section
    class="link-panel"
    aria-label="相關連結"
  >
    <a
      v-for="link in links"
      :key="link.id"
      class="link-row"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <UIcon
        :name="link.icon"
        class="link-row-icon"
      />
      <span class="link-row-body">
        <span class="link-row-title">{{ link.title }}</span>
        <span class="link-row-subtitle">{{ link.subtitle }}</span>
        <span class="link-row-url">{{ link.url }}</span>
      </span>
      <UIcon
        name="i-lucide-external-link"
        class="link-row-action"
      />
    </a>
  </section>
</template>

<script setup lang="ts">
import type { CompactLinkRow } from '../utils/published-products'

defineProps<{
  links: CompactLinkRow[]
}>()
</script>
