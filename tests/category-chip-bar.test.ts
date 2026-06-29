// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computed, defineComponent, h, ref } from 'vue'

import CategoryChipBar from '../app/components/category-chip-bar.vue'
import type { CategoryChipView } from '../app/utils/public-content-view-types'

// 沿用 nuxt-ui-component-adoption.test.ts 的 UButton stub 模式：UButton 帶 :to 時渲染 anchor，
// 把 aria-pressed 等 attrs 透傳，data-variant 反映 active 樣式，方便以 render 後 DOM 斷言（AC9）。
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

// happy-dom 環境下 import.meta.url 可能非 file scheme，改以 process.cwd()（vitest 在專案根執行）解析。
const CATALOG_CSS = readFileSync(resolve(process.cwd(), 'app/assets/styles/catalog.css'), 'utf8')

const TEST_CATEGORY_CHIPS: CategoryChipView[] = [
  { id: 'all', label: '全部', count: 3 },
  { id: 'home', label: '居家', count: 2 },
  { id: 'computer', label: '電腦', count: 1 },
]

function getChipTextWithoutCount(text: string) {
  return text.replace(/\d+$/, '').trim()
}

async function mountCategoryChipBar(options: {
  path: string
  params?: Record<string, string | string[]>
  chips?: CategoryChipView[]
}) {
  const shell_data = ref({ category_chips: options.chips ?? TEST_CATEGORY_CHIPS })

  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useRoute', () => ({ path: options.path, params: options.params ?? {} }))
  vi.stubGlobal('useCatalogShellData', async () => shell_data)

  const wrapper = mount(defineComponent({
    components: { CategoryChipBar },
    template: '<Suspense><CategoryChipBar /></Suspense>',
  }), {
    global: {
      stubs: {
        UButton: UButtonStub,
      },
    },
  })

  await flushPromises()

  return { wrapper }
}

function readChips(wrapper: Awaited<ReturnType<typeof mountCategoryChipBar>>['wrapper']) {
  return new Map(wrapper.findAll('.category-chip').map((chip) => [
    getChipTextWithoutCount(chip.text()),
    {
      aria_pressed: chip.attributes('aria-pressed'),
      href: chip.attributes('href'),
      variant: chip.attributes('data-variant'),
      count: chip.find('.chip-count').text(),
    },
  ]))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CategoryChipBar shared component', () => {
  it('should render one chip per source category chip as a crawlable anchor link', async () => {
    const { wrapper } = await mountCategoryChipBar({ path: '/' })
    const chips = wrapper.findAll('.category-chip')

    // 不對 fixture 數量寫死 magic number：渲染數量＝輸入 chips 數量（單一資料來源）。
    expect(chips).toHaveLength(TEST_CATEGORY_CHIPS.length)
    // 每個 chip 都是 anchor 且帶 href（可爬、可右鍵開新分頁，AC7 anchor 行為）。
    for (const chip of chips) {
      expect(chip.element.tagName).toBe('A')
      expect(chip.attributes('href')).toBeDefined()
    }
  })

  it('should mark the all chip active and link non-active chips to their category page on the home route', async () => {
    const { wrapper } = await mountCategoryChipBar({ path: '/' })
    const chips = readChips(wrapper)

    expect(chips.get('全部')).toEqual({
      aria_pressed: 'true',
      href: '/',
      variant: 'solid',
      count: '3',
    })
    expect(chips.get('電腦')).toEqual({
      aria_pressed: 'false',
      href: '/category/computer',
      variant: 'subtle',
      count: '1',
    })
    expect(chips.get('居家')).toEqual({
      aria_pressed: 'false',
      href: '/category/home',
      variant: 'subtle',
      count: '2',
    })
  })

  it('should mark the current category active and keep the all chip linking home on a category route', async () => {
    const { wrapper } = await mountCategoryChipBar({
      path: '/category/computer',
      params: { id: 'computer' },
    })
    const chips = readChips(wrapper)

    expect(chips.get('電腦')).toEqual({
      aria_pressed: 'true',
      href: '/category/computer',
      variant: 'solid',
      count: '1',
    })
    expect(chips.get('全部')).toEqual({
      aria_pressed: 'false',
      href: '/',
      variant: 'subtle',
      count: '3',
    })
  })

  // happy-dom 無法可靠驗 media query 的真實 display 計算；此處只驗 CSS 契約存在，
  // 桌機（≥1200px）display:none 的真實渲染由 coordinator 以 Playwright desktop viewport／agent-browser smoke 驗收（AC8/AC9）。
  it('should hide the shared chip bar at desktop width via catalog css contract', () => {
    const desktop_block = CATALOG_CSS.slice(CATALOG_CSS.indexOf('@media (min-width: 1200px)'))

    expect(desktop_block).toContain('.category-chip-bar {\n    display: none;\n  }')
    expect(CATALOG_CSS).not.toContain('.home-category-chip-list')
  })

  it('should resolve the active chip from the first value when the route id param is an array', async () => {
    const { wrapper } = await mountCategoryChipBar({
      path: '/category/home',
      params: { id: ['home'] },
    })
    const chips = readChips(wrapper)

    expect(chips.get('居家')?.aria_pressed).toBe('true')
    expect(chips.get('居家')?.variant).toBe('solid')
    expect(chips.get('全部')?.aria_pressed).toBe('false')
  })
})
