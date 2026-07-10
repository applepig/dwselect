// @vitest-environment happy-dom

import { flushPromises, mount, renderToString } from '@vue/test-utils'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCanonicalUrl } from '../app/utils/seo-metadata'

import DisqusThread from '../app/components/disqus-thread.vue'

const { get_disqus_shortname } = vi.hoisted(() => ({
  get_disqus_shortname: vi.fn(),
}))

vi.mock('../app/utils/disqus-settings', () => ({
  getDisqusShortname: get_disqus_shortname,
}))

const PRODUCT_A_PATH = '/products/product-a'
const PRODUCT_B_PATH = '/products/product-b'

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void

let observer_callback: ObserverCallback | null = null
const observe = vi.fn()
const unobserve = vi.fn()
const disconnect = vi.fn()
let appended_scripts: HTMLScriptElement[] = []

class IntersectionObserverStub {
  constructor(callback: ObserverCallback) {
    observer_callback = callback
  }

  observe = observe
  unobserve = unobserve
  disconnect = disconnect
}

function mountDisqusThread(options: { content_id?: string, route_path?: string } = {}) {
  const route_path = ref(options.route_path ?? PRODUCT_A_PATH)
  vi.stubGlobal('useRoute', () => ({
    get path() {
      return route_path.value
    },
  }))

  const wrapper = mount(DisqusThread, {
    props: {
      contentType: 'products',
      contentId: options.content_id ?? 'product-a',
    },
  })

  return { wrapper, route_path }
}

function enterViewport() {
  expect(observer_callback).not.toBeNull()
  observer_callback?.([{ isIntersecting: true }])
}

describe('DisqusThread', () => {
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('onUnmounted', onUnmounted)
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
    vi.stubGlobal('useRoute', () => ({ path: PRODUCT_A_PATH }))
    get_disqus_shortname.mockReturnValue('dwselect-test')
    appended_scripts = []
    vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
      appended_scripts = nodes.filter((node): node is HTMLScriptElement => node instanceof HTMLScriptElement)

      return undefined
    })
    observer_callback = null
    observe.mockClear()
    unobserve.mockClear()
    disconnect.mockClear()
  })

  afterEach(() => {
    document.head.innerHTML = ''
    const disqus_window = window as Window & { DISQUS?: unknown, disqus_config?: unknown }
    delete disqus_window.DISQUS
    delete disqus_window.disqus_config
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('短名缺席時不 render 留言區，也不建立 observer 或注入 script（AC15）', () => {
    get_disqus_shortname.mockReturnValue('')

    const { wrapper } = mountDisqusThread()

    expect(wrapper.find('.disqus-thread').exists()).toBe(false)
    expect(observe).not.toHaveBeenCalled()
    expect(appended_scripts).toEqual([])
  })

  it('SSR 不執行 observer 或注入 Disqus script（AC13）', async () => {
    const html = await renderToString(DisqusThread, {
      props: { contentType: 'products', contentId: 'product-a' },
    })

    expect(html).toContain('disqus-thread')
    expect(observe).not.toHaveBeenCalled()
    expect(appended_scripts).toEqual([])
  })

  it('進入 viewport 才以 canonical URL 與 type-id identifier 注入 embed script（AC13、AC14）', async () => {
    const { wrapper } = mountDisqusThread()
    await nextTick()

    expect(observe).toHaveBeenCalledWith(wrapper.find('.disqus-thread').element)
    expect(appended_scripts).toEqual([])

    enterViewport()

    const script = appended_scripts[0]
    const page = { page: { url: '', identifier: '' } }

    const disqus_window = window as Window & { disqus_config?: (this: typeof page) => void }
    disqus_window.disqus_config?.call(page)

    expect(script?.src).toBe('https://dwselect-test.disqus.com/embed.js')
    expect(page.page).toEqual({
      url: getCanonicalUrl(PRODUCT_A_PATH),
      identifier: 'products/product-a',
    })
  })

  it('script 載入失敗時顯示靜態 fallback，且不拋出主頁錯誤（AC16）', async () => {
    const on_app_error = vi.fn()
    const wrapper = mount(DisqusThread, {
      props: { contentType: 'products', contentId: 'product-a' },
      global: { config: { errorHandler: on_app_error } },
    })

    await nextTick()
    enterViewport()
    const script = appended_scripts[0]
    const on_error = script?.onerror as ((event: Event) => unknown) | null
    on_error?.(new Event('error'))
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(on_app_error).not.toHaveBeenCalled()
  })

  it('同一 SPA session 的 A 到 B 在既有 DISQUS 上 reset B thread，且不重複注入 script（AC14b）', async () => {
    const reset = vi.fn()
    const disqus_window = window as Window & { DISQUS?: { reset: typeof reset } }
    disqus_window.DISQUS = { reset }
    const { wrapper, route_path } = mountDisqusThread()

    await nextTick()
    enterViewport()
    route_path.value = PRODUCT_B_PATH
    await wrapper.setProps({ contentId: 'product-b' })

    expect(reset).toHaveBeenCalledTimes(2)
    expect(appended_scripts).toEqual([])

    const reset_options = reset.mock.calls[1]?.[0]
    const page = { page: { url: '', identifier: '' } }
    reset_options.config.call(page)

    expect(reset_options.reload).toBe(true)
    expect(page.page).toEqual({
      url: getCanonicalUrl(PRODUCT_B_PATH),
      identifier: 'products/product-b',
    })
  })
})
