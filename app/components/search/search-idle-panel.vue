<template>
  <div class="search-idle-container">
    <div
      v-if="history_items.length > 0"
      class="search-empty-panel search-history-panel"
    >
      <div class="search-panel-heading">
        <p class="empty-title">
          搜尋紀錄
        </p>
        <button
          type="button"
          class="search-clear-button"
          @click="$emit('clear-history')"
        >
          清除紀錄
        </button>
      </div>
      <div class="search-history-list">
        <button
          v-for="history_item in history_items"
          :key="`search-history-${history_item}`"
          type="button"
          class="search-history-item"
          @click="$emit('history-clicked', history_item)"
        >
          {{ history_item }}
        </button>
      </div>
    </div>

    <div class="search-empty-panel search-popular-panel">
      <p class="empty-title">
        熱門 tag
      </p>
      <div class="tag-chip-list">
        <NuxtLink
          v-for="tag in compact_all_tags"
          :key="`search-tag-${tag.label}`"
          :to="{ path: '/search', query: { q: tag.label } }"
          class="tag-chip"
          @click="$emit('tag-clicked', tag.label)"
        >
          <span>{{ tag.label }}</span>
          <span class="tag-count">{{ tag.count }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompactTagChip } from '../../utils/published-products/types'

defineProps<{
  history_items: string[]
  compact_all_tags: CompactTagChip[]
}>()
defineEmits<{
  'history-clicked': [query: string]
  'tag-clicked': [tag: string]
  'clear-history': []
}>()
</script>
