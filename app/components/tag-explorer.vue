<template>
  <section
    class="tag-explorer"
    aria-label="指南 tag"
  >
    <div class="tag-toolbar">
      <div class="tag-chip-list">
        <button
          v-for="tag in tags"
          :key="tag.label"
          type="button"
          class="tag-chip"
          :class="{ 'is-active': tag.active }"
          :aria-pressed="tag.active"
          @click="emit('toggleTag', tag.label)"
        >
          <span>{{ tag.label }}</span>
          <span class="tag-count">{{ tag.count }}</span>
        </button>
      </div>

      <button
        v-if="can_clear"
        type="button"
        class="clear-tags-button"
        @click="emit('clearTags')"
      >
        清除
      </button>
    </div>

    <p
      v-if="selected_tags.length > 0"
      class="selected-tags-note"
    >
      已選 {{ selected_tags.join('、') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type { CompactTagChip } from '../utils/published-products/types'

defineProps<{
  tags: CompactTagChip[]
  selected_tags: string[]
  can_clear: boolean
}>()

const emit = defineEmits<{
  toggleTag: [tag: string]
  clearTags: []
}>()
</script>
