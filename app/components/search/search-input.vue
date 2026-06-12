<template>
  <div class="search-input-shell">
    <UIcon
      name="i-lucide-search"
      class="search-input-icon"
      aria-hidden="true"
    />
    <input
      ref="search_input"
      :value="query"
      class="search-input"
      type="text"
      placeholder="在找什麼嗎？™"
      autocomplete="off"
      :disabled="!is_search_input_ready"
      @input="syncPendingSearchInputValue"
      @compositionstart="startPendingSearchComposition"
      @compositionend="endPendingSearchComposition"
      @keydown.enter="submitPendingSearchFromEvent"
    >
  </div>
</template>

<script setup lang="ts">
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
}>()
const search_input = ref<HTMLInputElement | null>(null)
const is_search_input_ready = ref(false)
const composition_state = createSearchInputCompositionState()

onMounted(() => {
  syncPendingSearchInputValue()
  is_search_input_ready.value = true
})

function submitPendingSearchFromEvent(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) {
    return
  }

  event.preventDefault()
  emit('submit', getInputEventValue(event))
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

function syncPendingSearchInputValue(event?: Event) {
  const input_value = event === undefined
    ? search_input.value?.value ?? ''
    : getInputEventValue(event)

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
