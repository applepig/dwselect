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

    <div
      v-if="popular_search_sections.length > 0"
      class="search-empty-panel search-popular-panel"
    >
      <div
        v-for="section in popular_search_sections"
        :key="section.id"
        class="search-popular-section"
        :data-section-id="section.id"
      >
        <p class="empty-title">
          {{ section.title }}
        </p>
        <div class="tag-chip-list">
          <NuxtLink
            v-for="tag in section.tags"
            :key="`search-${section.id}-${tag.label}`"
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
  </div>
</template>

<script setup lang="ts">
import type { CompactSearchTagGroups } from '../../utils/published-products/types'

const props = defineProps<{
  history_items: string[]
  popular_search_tags: CompactSearchTagGroups
}>()
defineEmits<{
  'history-clicked': [query: string]
  'tag-clicked': [tag: string]
  'clear-history': []
}>()

const popular_search_sections = computed(() => [
  {
    id: 'tags',
    title: '熱門標籤',
    tags: props.popular_search_tags.tags,
  },
  {
    id: 'brands',
    title: '熱門品牌',
    tags: props.popular_search_tags.brands,
  },
].filter((section) => section.tags.length > 0))
</script>
