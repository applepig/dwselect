<template>
  <UInput
    ref="search_input"
    :model-value="query"
    type="text"
    icon="i-lucide-search"
    placeholder="在找什麼嗎？™"
    size="lg"
    autocomplete="off"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    enterkeyhint="search"
    :disabled="!is_search_input_ready"
    class="search-input"
    @update:model-value="syncPendingSearchInputValue"
    @compositionstart="startPendingSearchComposition"
    @compositionend="endPendingSearchComposition"
    @keydown.enter="submitPendingSearchFromEvent"
  >
    <template #trailing>
      <div class="search-input-actions">
        <UButton
          v-if="has_query"
          type="button"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="清除搜尋"
          @click="clearPendingSearch"
        />
        <UButton
          type="button"
          icon="i-lucide-arrow-right"
          color="primary"
          variant="solid"
          size="sm"
          aria-label="送出搜尋"
          @click="submitPendingSearch()"
        />
      </div>
    </template>
  </UInput>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  createSearchInputCompositionState,
  endSearchInputComposition,
  getSearchInputQueryUpdate,
  startSearchInputComposition,
} from '../../utils/search/search-input-composition'

const props = defineProps<{
  query: string
}>()
const emit = defineEmits<{
  'update:query': [query: string]
  submit: [query: string]
  clear: []
}>()
const is_search_input_ready = ref(false)
const composition_state = createSearchInputCompositionState()
const has_query = computed(() => props.query.trim() !== '')

onMounted(() => {
  is_search_input_ready.value = true
})

function submitPendingSearchFromEvent(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) {
    return
  }

  event.preventDefault()
  submitPendingSearch(getInputEventValue(event))
}

function submitPendingSearch(query = props.query) {
  emit('submit', query)
}

function clearPendingSearch() {
  emit('update:query', '')
  emit('clear')
}

function startPendingSearchComposition() {
  startSearchInputComposition(composition_state)
}

function endPendingSearchComposition(event: CompositionEvent) {
  emitSearchInputQueryUpdate(endSearchInputComposition(
    composition_state,
    getInputEventValue(event),
    props.query,
  ))
}

function syncPendingSearchInputValue(input_value: string) {
  emitSearchInputQueryUpdate(getSearchInputQueryUpdate(composition_state, input_value, props.query))
}

function emitSearchInputQueryUpdate(query_update: string | null) {
  if (query_update === null) {
    return
  }

  emit('update:query', query_update)
}

function getInputEventValue(event: Event) {
  return event.target instanceof HTMLInputElement ? event.target.value : props.query
}
</script>
