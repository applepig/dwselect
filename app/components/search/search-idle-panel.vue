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
        <UButton
          v-for="history_item in history_items"
          :key="`search-history-${history_item}`"
          type="button"
          class="tag-chip"
          color="neutral"
          variant="subtle"
          @click="$emit('history-clicked', history_item)"
        >
          {{ history_item }}
        </UButton>
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
          <UButton
            v-for="tag in section.tags"
            :key="`search-${section.id}-${tag.id}`"
            :to="`${section.to_prefix}/${tag.id}`"
            class="tag-chip"
            color="neutral"
            variant="subtle"
          >
            <span>{{ tag.label }}</span>
            <template #trailing>
              <span class="tag-count">{{ tag.count }}</span>
            </template>
          </UButton>
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
}>()

// 熱門標籤深連 /tag/{id}、熱門品牌深連 /brand/{id}（brand 走專屬前綴、單一 canonical，ADR-8）。
const popular_search_sections = computed(() => [
  {
    id: 'tags',
    title: '熱門標籤',
    to_prefix: '/tag',
    tags: props.popular_search_tags.tags,
  },
  {
    id: 'brands',
    title: '熱門品牌',
    to_prefix: '/brand',
    tags: props.popular_search_tags.brands,
  },
].filter((section) => section.tags.length > 0))
</script>
