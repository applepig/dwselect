<template>
  <template
    v-for="(block, block_index) in blocks"
    :key="block_index"
  >
    <h4
      v-if="block.type === 'heading'"
      class="detail-llm-heading"
    >
      <template
        v-for="(segment, segment_index) in block.segments"
        :key="segment_index"
      >
        <a
          v-if="segment.type === 'link'"
          class="detail-llm-link"
          :href="segment.href"
          target="_blank"
          rel="noopener noreferrer"
        >{{ segment.text }}</a>
        <template v-else>
          {{ segment.text }}
        </template>
      </template>
    </h4>

    <ul
      v-else-if="block.type === 'list'"
      class="detail-llm-list"
    >
      <li
        v-for="(item, item_index) in block.items"
        :key="item_index"
      >
        <template
          v-for="(segment, segment_index) in item"
          :key="segment_index"
        >
          <a
            v-if="segment.type === 'link'"
            class="detail-llm-link"
            :href="segment.href"
            target="_blank"
            rel="noopener noreferrer"
          >{{ segment.text }}</a>
          <template v-else>
            {{ segment.text }}
          </template>
        </template>
      </li>
    </ul>

    <p
      v-else
      class="detail-llm-paragraph"
    >
      <template
        v-for="(segment, segment_index) in block.segments"
        :key="segment_index"
      >
        <a
          v-if="segment.type === 'link'"
          class="detail-llm-link"
          :href="segment.href"
          target="_blank"
          rel="noopener noreferrer"
        >{{ segment.text }}</a>
        <template v-else>
          {{ segment.text }}
        </template>
      </template>
    </p>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { parseContentMarkdown } from '../utils/markdown/parse-content-markdown'

const props = defineProps<{
  source: string
}>()

const blocks = computed(() => parseContentMarkdown(props.source))
</script>
