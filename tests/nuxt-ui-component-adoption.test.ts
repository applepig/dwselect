// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'

import IndexPage from '../app/pages/index.vue'
import { buildPublicContentPayload } from '../scripts/public-content'
import { makeProduct, test_guides, test_links, test_taxonomies } from './published-products/fixtures'

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

// chip 列已抽成共用 CategoryChipBar（B1），首頁僅委派渲染；chip 行為斷言移至 category-chip-bar.test.ts。
// 此處 stub 元件，只驗首頁有掛載共用 chip bar、不再各寫一份。
const CategoryChipBarStub = defineComponent({
  name: 'CategoryChipBar',
  setup() {
    return () => h('div', { class: 'category-chip-bar-stub' })
  },
})

// UEmpty stub 渲染 title prop，讓空狀態文案能以 render 行為斷言（而非 grep 頁面原始碼）。
const UEmptyStub = defineComponent({
  name: 'UEmpty',
  props: { title: { type: String, default: '' } },
  setup(props) {
    return () => h('div', { class: 'u-empty-stub' }, props.title)
  },
})

async function mountIndexPage(options: {
  products?: ReturnType<typeof makeProduct>[]
} = {}) {
  const products = options.products ?? [
    makeProduct({ id: 'home-product', status: 'published', name: '居家商品', category_id: 'home' }),
    makeProduct({ id: 'computer-product', status: 'published', name: '電腦商品', category_id: 'computer' }),
  ]
  const content_payload = ref(buildPublicContentPayload({
    products,
    guides: test_guides,
    links: test_links,
    taxonomies: test_taxonomies,
  }))
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useRoute', () => ({ path: '/', query: {} }))
  vi.stubGlobal('useCatalogData', async () => ({ content_payload }))
  vi.stubGlobal('useHead', vi.fn())
  vi.stubGlobal('useSeoMeta', vi.fn())

  const wrapper = mount(defineComponent({
    components: { IndexPage },
    template: '<Suspense><IndexPage /></Suspense>',
  }), {
    global: {
      stubs: {
        ProductCard: ProductCardStub,
        CategoryChipBar: CategoryChipBarStub,
        UButton: UButtonStub,
        UEmpty: UEmptyStub,
      },
    },
  })

  await flushPromises()

  return { wrapper }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('home page category chip delegation', () => {
  it('should delegate home category chips to the shared CategoryChipBar instead of inlining its own chip list', async () => {
    const { wrapper } = await mountIndexPage()

    // chip 列已抽成共用元件（AC6）：首頁掛載 CategoryChipBar，不再各自 inline 一份 chip markup。
    // chip 的 href／active／aria-pressed／count 行為由 tests/category-chip-bar.test.ts 以 DOM 斷言驗收。
    expect(wrapper.find('.category-chip-bar-stub').exists()).toBe(true)
    expect(wrapper.find('.category-chip').exists()).toBe(false)
  })
})

describe('home empty state', () => {
  it('should render the home empty state wording when no products are published', async () => {
    const { wrapper } = await mountIndexPage({ products: [] })

    expect(wrapper.text()).toContain('目前沒有已上架商品')
  })
})
