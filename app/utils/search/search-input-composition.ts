export type SearchInputCompositionState = {
  is_composing: boolean
}

export function createSearchInputCompositionState(): SearchInputCompositionState {
  return { is_composing: false }
}

export function startSearchInputComposition(composition_state: SearchInputCompositionState) {
  composition_state.is_composing = true
}

export function endSearchInputComposition(
  composition_state: SearchInputCompositionState,
  input_value: string,
  current_query: string,
) {
  composition_state.is_composing = false

  return getSearchInputQueryUpdate(composition_state, input_value, current_query)
}

export function getSearchInputQueryUpdate(
  composition_state: SearchInputCompositionState,
  input_value: string,
  current_query: string,
) {
  if (composition_state.is_composing) {
    return null
  }

  if (input_value === current_query) {
    return null
  }

  return input_value
}
