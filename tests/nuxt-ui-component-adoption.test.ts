// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { computed, defineComponent, h, ref } from 'vue'

import IndexPage from '../app/pages/index.vue'
import { buildPublicContentPayload } from '../scripts/public-content'
import { makeProduct, test_guides, test_links, test_taxonomies } from './published-products/fixtures'

function readSource(relative_path: string) {
  return readFileSync(new URL(relative_path, import.meta.url), 'utf8')
}

const UButtonStub = defineComponent({
  name: 'UButton',
  props: {
    to: { type: [String, Object], default: null },
    color: { type: String, default: '' },
    variant: { type: String, default: '' },
  },
  setup(props, { attrs, slots }) {
    return () => h('a', {
      ...attrs,
      href: typeof props.to === 'string' ? props.to : undefined,
      'data-color': props.color,
      'data-variant': props.variant,
    }, [slots.default?.(), slots.trailing?.()])
  },
})

const ProductCardStub = defineComponent({
  name: 'ProductCard',
  props: {
    product: { type: Object, required: true },
  },
  setup(props) {
    return () => h('article', { class: 'product-card' }, String((props.product as { name?: string }).name ?? ''))
  },
})

function getChipTextWithoutCount(text: string) {
  return text.replace(/\d+$/, '').trim()
}

async function mountIndexPage(options: {
  route_query?: Record<string, string | string[]>
  category_ids?: string[]
} = {}) {
  const content_payload = ref(buildPublicContentPayload({
    products: [
      makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
      makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
    ],
    guides: test_guides,
    links: test_links,
    taxonomies: test_taxonomies,
  }))
  const category_ids = ref(new Set(options.category_ids ?? ['home', 'computer']))
  const navigate_to = vi.fn()

  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useRoute', () => ({ path: '/', query: options.route_query ?? {} }))
  vi.stubGlobal('useCatalogData', async () => ({ content_payload, category_ids }))
  vi.stubGlobal('useHead', vi.fn())
  vi.stubGlobal('useSeoMeta', vi.fn())
  vi.stubGlobal('navigateTo', navigate_to)
  vi.stubGlobal('useNuxtApp', () => ({
    runWithContext: (callback: () => unknown) => callback(),
  }))

  const wrapper = mount(defineComponent({
    components: { IndexPage },
    template: '<Suspense><IndexPage /></Suspense>',
  }), {
    global: {
      stubs: {
        ProductCard: ProductCardStub,
        UButton: UButtonStub,
        UEmpty: true,
      },
    },
  })

  await flushPromises()

  return { wrapper, navigate_to }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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
  const tag_explorer_source = readSource('../app/components/tag-explorer.vue')
  const idle_panel_source = readSource('../app/components/search/search-idle-panel.vue')
  const catalog_css = readSource('../app/assets/styles/catalog.css')

  it('should render home category chips as UButton links with variant active state and counts', async () => {
    const { wrapper } = await mountIndexPage()
    const chip_links = new Map(wrapper.findAll('.category-chip').map((chip) => [
      getChipTextWithoutCount(chip.text()),
      {
        aria_pressed: chip.attributes('aria-pressed'),
        href: chip.attributes('href'),
        variant: chip.attributes('data-variant'),
        count: chip.find('.chip-count').text(),
      },
    ]))

    expect(chip_links.get('全部')).toEqual({
      aria_pressed: 'true',
      href: '/',
      variant: 'solid',
      count: '2',
    })
    expect(chip_links.get('電腦')).toEqual({
      aria_pressed: 'false',
      href: '/category/computer',
      variant: 'subtle',
      count: '1',
    })
    expect(wrapper.find('button.category-chip').exists()).toBe(false)
  })

  it('should soft redirect a single selectable legacy category query to the category taxonomy page', async () => {
    const { navigate_to } = await mountIndexPage({
      route_query: { category: 'computer' },
      category_ids: ['home', 'computer'],
    })

    expect(navigate_to).toHaveBeenCalledWith('/category/computer')
  })

  it.each([
    ['unknown category id', { category: 'missing' }],
    ['empty category id', { category: '' }],
    ['all sentinel', { category: 'all' }],
    ['array category query', { category: ['home', 'computer'] }],
  ])('should keep rendering the full home page for an invalid legacy category query: %s', async (_case_name, route_query) => {
    const { navigate_to } = await mountIndexPage({
      route_query,
      category_ids: ['home', 'computer'],
    })

    expect(navigate_to).not.toHaveBeenCalled()
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
    // 熱門 chip 深連 taxonomy 頁（AC16），不再以 label 打文字搜尋；
    // 標籤走 /tag、品牌走 /brand（AC24），前綴由 section.to_prefix 決定。
    expect(idle_panel_source).toContain(':to="`${section.to_prefix}/${tag.id}`"')
    expect(idle_panel_source).toContain("to_prefix: '/tag'")
    expect(idle_panel_source).toContain("to_prefix: '/brand'")
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
    expect(catalog_css).toContain('min-height: 38px')
    expect(catalog_css).toContain('padding-block: 0')
    expect(catalog_css).toContain('padding-inline: 20px')
    expect(catalog_css).toContain('white-space: nowrap')
    expect(catalog_css).toContain('word-break: keep-all')
  })
})
