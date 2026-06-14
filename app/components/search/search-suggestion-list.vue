<template>
  <div class="search-empty-panel search-suggestion-panel">
    <p class="empty-title">
      建議
    </p>
    <div
      v-if="suggestions.length > 0"
      class="search-suggestion-list"
    >
      <button
        v-for="suggestion in suggestions"
        :key="suggestion.document_id"
        type="button"
        class="search-suggestion-item"
        @click="$emit('suggestion-clicked', suggestion)"
      >
        <span class="search-suggestion-type">{{ getResultTypeLabel(suggestion.type) }}</span>
        <span class="search-suggestion-title">{{ suggestion.title }}</span>
        <span class="search-suggestion-summary">{{ suggestion.summary }}</span>
      </button>
    </div>
    <p
      v-else-if="is_suggestion_loading"
      class="search-helper-text"
    >
      載入建議中
    </p>
    <p
      v-else
      class="search-helper-text"
    >
      沒有建議，按 Enter 搜尋。
    </p>
  </div>
</template>

<script setup lang="ts">
import type { SearchSuggestion } from '../../utils/search/search-index'

defineProps<{
  suggestions: SearchSuggestion[]
  is_suggestion_loading: boolean
}>()
defineEmits<{
  'suggestion-clicked': [suggestion: SearchSuggestion]
}>()

function getResultTypeLabel(type: SearchSuggestion['type']) {
  if (type === 'guide') {
    return '指南'
  }

  if (type === 'link') {
    return '連結'
  }

  return '產品'
}
</script>
