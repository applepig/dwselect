// @vitest-environment happy-dom

import type { Ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref, shallowRef, Suspense, watchEffect } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ProductDetailPage from '../app/pages/products/[id].vue'
import type { ProductDetailView } from '../app/utils/public-content-view-types'

function makeProductDetailView(overrides: Partial<ProductDetailView> = {}): ProductDetailView {
  return {
    id: 'sample-product',
    name: '示範商品',
    summary: '摘要',
    long_description: '長描述',
    llm_description: '',
    hero_image_url: '/products/images/sample.jpg',
    hero_alt: '示範商品',
    category_id: 'computer-3c',
    category_label: '電腦3C',
    channel_id: 'pchome',
    channel_label: 'PChome',
    tag_ids: [],
    tag_labels: [],
    brand_ids: [],
    brand_labels: [],
    price_label: 'NT$1,000',
    buy_url: 'https://example.com/buy',
    fine_print: '',
    reference_links: [],
    related_products: [],
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve_deferred: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    resolve_deferred = resolve
  })

  return {
    promise,
    resolve: resolve_deferred,
  }
}

function stubProductDetailPageRuntime(fetch_promise: Promise<Ref<ProductDetailView | null>>) {
  const use_head = vi.fn()
  const use_seo_meta = vi.fn()
  const use_product_detail_data = vi.fn((_product_id: string) => fetch_promise)

  // [id].vue 依賴 Nuxt auto-import 全域；bare vitest 環境需逐一 stub。
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('shallowRef', shallowRef)
  vi.stubGlobal('watchEffect', watchEffect)
  vi.stubGlobal('useRoute', () => ({ params: { id: 'sample-product' } }))
  vi.stubGlobal('useHead', use_head)
  vi.stubGlobal('useSeoMeta', use_seo_meta)
  vi.stubGlobal('useProductDetailData', use_product_detail_data)
  vi.stubGlobal('createError', vi.fn((input: unknown) => new Error(JSON.stringify(input))))

  return {
    use_head,
    use_seo_meta,
    use_product_detail_data,
  }
}

function mountProductDetailPage() {
  // 頁面是 async setup（top-level await），需包 Suspense 才能 mount；
  // setup 會同步執行到第一個 await 為止，head 註冊時序因此可觀測。
  const SuspenseHost = defineComponent({
    setup() {
      return () => h(Suspense, null, { default: () => h(ProductDetailPage) })
    },
  })

  return mount(SuspenseHost, {
    global: {
      stubs: {
        ProductDetail: true,
      },
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('product detail page head registration', () => {
  it('should register head and SEO meta before the awaited product detail data resolves', async () => {
    // await 之後 SSR component context 遺失，useHead/useSeoMeta 會靜默失效，
    // per-product OG／canonical 因此退化——head 必須在 await 前註冊。
    const deferred_fetch = createDeferred<Ref<ProductDetailView | null>>()
    const runtime = stubProductDetailPageRuntime(deferred_fetch.promise)

    mountProductDetailPage()

    // 此刻 detail data promise 仍 pending，head 與 SEO meta 已完成註冊。
    expect(runtime.use_head).toHaveBeenCalledTimes(1)
    expect(runtime.use_seo_meta).toHaveBeenCalledTimes(1)
    expect(runtime.use_product_detail_data).toHaveBeenCalledWith('sample-product')

    deferred_fetch.resolve(ref(makeProductDetailView()))
    await flushPromises()
  })
})
