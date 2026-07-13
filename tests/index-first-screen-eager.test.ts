// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'

import IndexPage from '../app/pages/index.vue'
import { buildPublicContentPayload } from '../scripts/public-content'
import { makeProduct, test_guides, test_links, test_taxonomies } from './published-products/fixtures'

// 記錄每張卡收到的 eager / high_priority binding，讓首頁 v-for 接線（前 N 張 eager、首張 high）
// 能以頁面層 render 行為斷言——單卡測試（product-card-responsive-image）不經過 index.vue 的 v-for。
const ProductCardStub = defineComponent({
  name: 'ProductCard',
  props: {
    product: { type: Object, required: true },
    eager: { type: Boolean, default: false },
    // Vue 以宣告名精確比對，index.vue 綁 :high_priority；此處同名接收。
    high_priority: { type: Boolean, default: false },
  },
  setup(props) {
    return () => h('article', {
      class: 'product-card',
      'data-eager': String(props.eager),
      'data-high-priority': String(props.high_priority),
    }, String((props.product as { name?: string }).name ?? ''))
  },
})

const CategoryChipBarStub = defineComponent({
  name: 'CategoryChipBar',
  setup() {
    return () => h('div', { class: 'category-chip-bar-stub' })
  },
})

const UEmptyStub = defineComponent({
  name: 'UEmpty',
  props: { title: { type: String, default: '' } },
  setup(props) {
    return () => h('div', { class: 'u-empty-stub' }, props.title)
  },
})

async function mountIndexPage(product_count: number) {
  const products = Array.from({ length: product_count }, (_, i) =>
    makeProduct({ id: `product-${i}`, status: 'published', name: `商品 ${i}`, category_id: 'home' }))

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
        UEmpty: UEmptyStub,
      },
    },
  })

  await flushPromises()

  const cards = wrapper.findAll('.product-card')
  return {
    eager_flags: cards.map((card) => card.attributes('data-eager')),
    high_flags: cards.map((card) => card.attributes('data-high-priority')),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('首頁首屏卡片 eager / 高優先序接線', () => {
  it('前 6 張卡 eager、第 7 張起 lazy；僅首張帶 high_priority', async () => {
    const { eager_flags, high_flags } = await mountIndexPage(8)

    expect(eager_flags).toHaveLength(8)
    // 前 6 張 eager（LCP 候選不被 lazy 延後），第 7、8 張 lazy。
    expect(eager_flags.slice(0, 6)).toEqual(Array(6).fill('true'))
    expect(eager_flags.slice(6)).toEqual(['false', 'false'])
    // 僅首張搶抓取優先序，避免多張 high 稀釋頻寬。
    expect(high_flags[0]).toBe('true')
    expect(high_flags.slice(1).every((flag) => flag === 'false')).toBe(true)
  })

  it('首屏卡數少於 eager 張數時（過濾後僅 2 張）eager 邏輯不越界、不報錯（Edge Case 5）', async () => {
    const { eager_flags, high_flags } = await mountIndexPage(2)

    // 全部 eager（都在首屏），無 index 越界或多餘卡；仍僅首張 high。
    expect(eager_flags).toEqual(['true', 'true'])
    expect(high_flags).toEqual(['true', 'false'])
  })
})
