// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { Component } from 'vue'

import CategoryPage from '../../app/pages/category/[id].vue'
import TagPage from '../../app/pages/tag/[id].vue'
import BrandPage from '../../app/pages/brand/[id].vue'
import ChannelPage from '../../app/pages/channel/[id].vue'

// 032 M3：四頁的 setup 共用邏輯（route id 正規化、canonical、404、useHead／useSeoMeta、fetch）已收進
// useTaxonomyDetailPage composable，其行為守門在 tests/use-taxonomy-detail-page.test.ts。
// 本檔守各頁自留的職責，以 render 行為斷言（取代 .vue source-grep）：以正確 kind 接線 composable、
// 組成共用 TaxonomyPage（不 inline list markup）、CategoryChipBar 僅出現在 category 頁。

// TaxonomyPage／CategoryChipBar 皆 auto-import 元件，這裡以 stub 攔截，render 後由存在與否斷言頁面組成。
const TaxonomyPageStub = defineComponent({
  name: 'TaxonomyPage',
  props: { data: { type: Object, required: true } },
  setup() {
    return () => h('section', { class: 'taxonomy-page-stub' })
  },
})

const CategoryChipBarStub = defineComponent({
  name: 'CategoryChipBar',
  setup() {
    return () => h('div', { class: 'category-chip-bar-stub' })
  },
})

// useTaxonomyDetailPage 是 auto-import 的 async composable，頁面以 `await useTaxonomyDetailPage(kind)` 接線並取 page_data。
// spy 回傳頁面 render 所需的最小 shape：truthy page_data 讓 v-if 通過、TaxonomyPage 得以渲染。
async function mountTaxonomyPage(page: Component) {
  const spy = vi.fn(async () => ({
    page_data: ref({ label: 'x', description: '', products: [], guides: [], links: [] }),
  }))

  vi.stubGlobal('useTaxonomyDetailPage', spy)

  const wrapper = mount(defineComponent({
    components: { Page: page },
    template: '<Suspense><Page /></Suspense>',
  }), {
    global: {
      stubs: {
        TaxonomyPage: TaxonomyPageStub,
        CategoryChipBar: CategoryChipBarStub,
      },
    },
  })

  await flushPromises()

  return { wrapper, spy }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('taxonomy page shells', () => {
  it.each([
    ['category', CategoryPage],
    ['tag', TagPage],
    ['brand', BrandPage],
    ['channel', ChannelPage],
  ] as const)('should wire the %s page to the shared composable with its own taxonomy kind', async (kind, page) => {
    const { spy } = await mountTaxonomyPage(page)

    expect(spy).toHaveBeenCalledWith(kind)
  })

  it.each([
    ['category', CategoryPage],
    ['tag', TagPage],
    ['brand', BrandPage],
    ['channel', ChannelPage],
  ] as const)('should compose the shared TaxonomyPage on the %s page rather than inlining list markup', async (_kind, page) => {
    const { wrapper } = await mountTaxonomyPage(page)

    expect(wrapper.findComponent(TaxonomyPageStub).exists()).toBe(true)
    // 「不 inline」的負向守門：list markup 應交給 TaxonomyPage，頁面本身不得自行渲染 product-grid／ResourceList。
    expect(wrapper.find('.product-grid').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ResourceList' }).exists()).toBe(false)
  })

  it('should mount the shared CategoryChipBar only on the category shell, never on other taxonomy shells', async () => {
    // 031.1 B1（AC6）：分類頁以共用 CategoryChipBar 持久化 chip bar。
    // Why：鎖住此接線，防 B1 行為被誤移除；並守住非目標邊界——
    // tag/brand/channel 頁不得出現 category chip bar（spec「非目標」第二條），避免 chip bar 外溢其他 taxonomy 頁。
    const { wrapper: category_wrapper } = await mountTaxonomyPage(CategoryPage)

    expect(category_wrapper.findComponent(CategoryChipBarStub).exists()).toBe(true)

    for (const page of [TagPage, BrandPage, ChannelPage]) {
      const { wrapper } = await mountTaxonomyPage(page)

      expect(wrapper.findComponent(CategoryChipBarStub).exists()).toBe(false)
    }
  })
})
