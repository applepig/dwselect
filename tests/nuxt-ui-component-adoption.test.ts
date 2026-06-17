import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

function readSource(relative_path: string) {
  return readFileSync(new URL(relative_path, import.meta.url), 'utf8')
}

describe('search input adopts UInput', () => {
  const input_source = readSource('../app/components/search/search-input.vue')

  it('should render the search field as a UInput with a leading search icon', () => {
    expect(input_source).toContain('<UInput')
    expect(input_source).toContain('icon="i-lucide-search"')
    expect(input_source).toContain('type="text"')
    expect(input_source).not.toContain('class="search-input-shell"')
    expect(input_source).not.toContain('class="search-input-icon"')
  })

  it('should explicitly forward mobile keyboard and autofill attributes that UInput does not default', () => {
    expect(input_source).toContain('enterkeyhint="search"')
    expect(input_source).toContain('autocomplete="off"')
    expect(input_source).toContain('autocapitalize="off"')
    expect(input_source).toContain('autocorrect="off"')
    expect(input_source).toContain('spellcheck="false"')
  })

  it('should keep the IME composition guard so Enter during composition does not submit', () => {
    expect(input_source).toContain('@compositionstart="startPendingSearchComposition"')
    expect(input_source).toContain('@compositionend="endPendingSearchComposition"')
    expect(input_source).toContain('@keydown.enter="submitPendingSearchFromEvent"')
    expect(input_source).toContain('event.isComposing')
    expect(input_source).toContain('event.preventDefault()')
  })

  it('should preserve the unchanged outward contract of query, submit and clear', () => {
    expect(input_source).toContain('\'update:query\': [query: string]')
    expect(input_source).toContain('submit: [query: string]')
    expect(input_source).toContain('clear: []')
    expect(input_source).toContain(':model-value="query"')
    expect(input_source).toContain('@update:model-value="syncPendingSearchInputValue"')
  })

  it('should show the clear button only when there is a query and emit clear on click', () => {
    expect(input_source).toContain('v-if="has_query"')
    expect(input_source).toContain('@click="clearPendingSearch"')
    expect(input_source).toContain('@click="submitPendingSearch()"')
    expect(input_source).toContain('emit(\'clear\')')
    expect(input_source).toContain('emit(\'submit\', query)')
  })
})

describe('clickable chips adopt UButton with variant-based active state', () => {
  const index_source = readSource('../app/pages/index.vue')
  const tag_explorer_source = readSource('../app/components/tag-explorer.vue')
  const idle_panel_source = readSource('../app/components/search/search-idle-panel.vue')
  const catalog_css = readSource('../app/assets/styles/catalog.css')

  it('should render home category chips as UButton, drop the is-active class hook and keep aria-pressed and count', () => {
    expect(index_source).toContain('<UButton')
    expect(index_source).not.toContain('class="category-chip"\n        :class="{ \'is-active\': chip.active }"')
    expect(index_source).not.toContain('\'is-active\': chip.active')
    expect(index_source).toContain(':variant="chip.active ? \'solid\' : \'subtle\'"')
    expect(index_source).toContain(':aria-pressed="chip.active"')
    expect(index_source).toContain('{{ chip.count }}')
    expect(index_source).toContain('@click="onCategoryChipClicked(chip.id)"')
  })

  it('should render tag-explorer tag chips and clear button as UButton with variant active state', () => {
    expect(tag_explorer_source).toContain('<UButton')
    expect(tag_explorer_source).not.toContain('\'is-active\': tag.active')
    expect(tag_explorer_source).toContain(':variant="tag.active ? \'solid\' : \'subtle\'"')
    expect(tag_explorer_source).toContain(':aria-pressed="tag.active"')
    expect(tag_explorer_source).toContain('{{ tag.count }}')
    expect(tag_explorer_source).toContain('@click="emit(\'toggleTag\', tag.label)"')
    expect(tag_explorer_source).toContain('@click="emit(\'clearTags\')"')
  })

  it('should render search idle history and popular chips as UButton while keeping navigation and counts', () => {
    expect(idle_panel_source).toContain('<UButton')
    expect(idle_panel_source).not.toContain('<button')
    expect(idle_panel_source).toContain('@click="$emit(\'history-clicked\', history_item)"')
    expect(idle_panel_source).toContain(':to="{ path: \'/search\', query: { q: tag.label } }"')
    expect(idle_panel_source).toContain('@click="$emit(\'tag-clicked\', tag.label)"')
    expect(idle_panel_source).toContain('{{ tag.count }}')
  })

  it('should drop the removed chip and clear-button base styling from catalog css', () => {
    expect(catalog_css).not.toContain('.category-chip.is-active')
    expect(catalog_css).not.toContain('.tag-chip.is-active')
    expect(catalog_css).not.toContain('.search-input-shell')
    expect(catalog_css).not.toContain('.search-input-icon')
  })

  it('should keep chip layout containers and focus-visible affordances', () => {
    expect(catalog_css).toContain('.category-chip-list')
    expect(catalog_css).toContain('.tag-chip-list')
    expect(catalog_css).toContain('.category-chip:focus-visible')
    expect(catalog_css).toContain('.tag-chip:focus-visible')
  })

  it('should keep shared chips compact without shrinking the touch target too far', () => {
    expect(catalog_css).toContain('min-height: 44px')
    expect(catalog_css).toContain('padding-block: 4px')
    expect(catalog_css).toContain('padding-inline: 14px')
  })
})
