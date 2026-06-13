<template>
  <div class="search-idle-container">
    <div
      v-if="history_items.length > 0"
      class="search-empty-panel search-history-panel"
    >
      <p class="empty-title">
        搜尋紀錄
      </p>
      <div class="tag-chip-list">
        <button
          v-for="history_item in history_items"
          :key="`search-history-${history_item}`"
          type="button"
          class="tag-chip"
          @click="$emit('history-clicked', history_item)"
        >
          {{ history_item }}
        </button>
      </div>
    </div>

    <template v-if="popular_search_sections.length > 0">
      <div
        v-for="section in popular_search_sections"
        :key="section.id"
        class="search-empty-panel search-popular-panel"
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
    </template>
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
