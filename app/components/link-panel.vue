<template>
  <ResourceList
    class="link-panel"
    :rows="links"
    aria_label="相關連結"
  />
</template>

<script setup lang="ts">
import type { CompactResourceRow } from '../utils/published-products/types'

defineProps<{
  links: CompactResourceRow[]
}>()
</script>
