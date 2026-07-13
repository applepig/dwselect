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

// 組件只從 'vue' import nextTick（其餘用 stubbed globals），故 partial-mock 只攔 nextTick，
// 用可控 gate 讓 loadThread 的 retry await 掛起，以確定性地製造「await 後 owner 已換手」的競態。
const next_tick_control = vi.hoisted(() => ({ gate: null as Promise<void> | null }))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()

  return {
    ...actual,
    nextTick: (fn?: () => void) => {
      if (next_tick_control.gate !== null) {
        return next_tick_control.gate.then(fn)
      }

      return actual.nextTick(fn)
    },
  }
})

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
    const append_to_head = document.head.append.bind(document.head)
    vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
      appended_scripts.push(...nodes.filter((node): node is HTMLScriptElement => node instanceof HTMLScriptElement))
      nodes.filter((node): node is HTMLScriptElement => node instanceof HTMLScriptElement).forEach((node) => {
        node.type = 'application/x-disqus-test'
      })

      append_to_head(...nodes)
    })
    observer_callback = null
    observe.mockClear()
    unobserve.mockClear()
    disconnect.mockClear()
  })

  afterEach(() => {
    next_tick_control.gate = null
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
    const page = { page: { url: '', identifier: '' }, language: '' }

    const disqus_window = window as Window & { disqus_config?: (this: typeof page) => void }
    disqus_window.disqus_config?.call(page)

    expect(script?.src).toBe('https://dwselect-test.disqus.com/embed.js')
    expect(page.page).toEqual({
      url: getCanonicalUrl(PRODUCT_A_PATH),
      identifier: 'products/product-a',
    })
    expect(page.language).toBe('zh_TW')
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

  it('script 載入失敗後移除 dead script，下一次 thread 嘗試會注入新的 script', async () => {
    const { wrapper, route_path } = mountDisqusThread()
    await nextTick()
    enterViewport()

    const failed_script = appended_scripts[0]
    const on_error = failed_script?.onerror as ((event: Event) => unknown) | null
    on_error?.(new Event('error'))
    await flushPromises()

    expect(document.head.querySelector('[data-disqus-embed="true"]')).toBeNull()

    route_path.value = PRODUCT_B_PATH
    await wrapper.setProps({ contentId: 'product-b' })
    await flushPromises()

    expect(appended_scripts).toHaveLength(2)
    expect(appended_scripts[1]).not.toBe(failed_script)
  })

  it('重試時先恢復被 fallback 移除的 target，再 reset 下一個 thread', async () => {
    const { wrapper, route_path } = mountDisqusThread()
    await nextTick()
    enterViewport()

    const failed_script = appended_scripts[0]
    const on_error = failed_script?.onerror as ((event: Event) => unknown) | null
    on_error?.(new Event('error'))
    await flushPromises()
    expect(wrapper.find('#disqus_thread').exists()).toBe(false)

    let target_exists_when_reset = false
    const reset = vi.fn(() => {
      target_exists_when_reset = wrapper.find('#disqus_thread').exists()
    })
    const disqus_window = window as Window & { DISQUS?: { reset: typeof reset } }
    disqus_window.DISQUS = { reset }
    route_path.value = PRODUCT_B_PATH
    await wrapper.setProps({ contentId: 'product-b' })
    await flushPromises()

    expect(reset).toHaveBeenCalledTimes(1)
    expect(target_exists_when_reset).toBe(true)
  })

  it('A 的 pending script resolve 後以最新 remount 的 B config reset，不 render A thread 到 B', async () => {
    const { wrapper: wrapper_a } = mountDisqusThread()
    await nextTick()
    enterViewport()
    await Promise.resolve()
    const pending_script = appended_scripts[0]

    wrapper_a.unmount()
    const { wrapper: wrapper_b } = mountDisqusThread({ content_id: 'product-b', route_path: PRODUCT_B_PATH })
    await nextTick()

    const owner_page = { page: { url: '', identifier: '' } }
    const disqus_config = (window as Window & { disqus_config?: (this: typeof owner_page) => void }).disqus_config
    disqus_config?.call(owner_page)
    expect(owner_page.page).toEqual({
      url: getCanonicalUrl(PRODUCT_B_PATH),
      identifier: 'products/product-b',
    })

    const reset = vi.fn()
    const disqus_window = window as Window & { DISQUS?: { reset: typeof reset } }
    disqus_window.DISQUS = { reset }
    const on_load = pending_script?.onload as ((event: Event) => unknown) | null
    expect(on_load).toBeTypeOf('function')
    on_load?.(new Event('load'))
    await Promise.resolve()
    await flushPromises()

    expect(wrapper_b.find('#disqus_thread').exists()).toBe(true)
    expect(reset).toHaveBeenCalledTimes(1)
    const page = { page: { url: '', identifier: '' } }
    reset.mock.calls[0]?.[0].config.call(page)
    expect(page.page).toEqual({
      url: getCanonicalUrl(PRODUCT_B_PATH),
      identifier: 'products/product-b',
    })
  })

  it('A 的 pending script 期間 B remount 並進入 viewport 時共用 script，並載入 B thread（AC14b）', async () => {
    const { wrapper: wrapper_a } = mountDisqusThread()
    await nextTick()
    enterViewport()
    const pending_script = appended_scripts[0]
    expect(document.querySelector('[data-disqus-embed="true"]')).toBe(pending_script)

    wrapper_a.unmount()
    const { wrapper: wrapper_b } = mountDisqusThread({ content_id: 'product-b', route_path: PRODUCT_B_PATH })
    await nextTick()
    enterViewport()

    expect(appended_scripts).toHaveLength(1)

    const reset = vi.fn()
    const disqus_window = window as Window & { DISQUS?: { reset: typeof reset } }
    disqus_window.DISQUS = { reset }
    const on_load = pending_script?.onload as ((event: Event) => unknown) | null
    on_load?.(new Event('load'))
    await flushPromises()

    expect(wrapper_b.find('#disqus_thread').exists()).toBe(true)
    expect(reset).toHaveBeenCalledTimes(1)
    const page = { page: { url: '', identifier: '' } }
    reset.mock.calls[0]?.[0].config.call(page)
    expect(page.page).toEqual({
      url: getCanonicalUrl(PRODUCT_B_PATH),
      identifier: 'products/product-b',
    })
  })

  it('A 的 pending script 載入時 B reset throw（embed 已執行），B 顯示 fallback 但保留 runtime，retry 不重載 embed', async () => {
    const { wrapper: wrapper_a } = mountDisqusThread()
    await nextTick()
    enterViewport()
    const pending_script = appended_scripts[0]

    wrapper_a.unmount()
    const { wrapper: wrapper_b, route_path } = mountDisqusThread({ content_id: 'product-b', route_path: PRODUCT_B_PATH })
    await nextTick()
    enterViewport()

    const reset = vi.fn(() => {
      throw new Error('Disqus reset failed')
    })
    const disqus_window = window as Window & { DISQUS?: { reset: typeof reset } }
    disqus_window.DISQUS = { reset }
    const on_load = pending_script?.onload as ((event: Event) => unknown) | null

    expect(() => on_load?.(new Event('load'))).not.toThrow()
    await flushPromises()

    expect(wrapper_b.find('[role="alert"]').exists()).toBe(true)
    // embed.js 已執行過：不清 runtime、不移除已執行的 script
    expect(disqus_window.DISQUS).toBeDefined()
    expect(document.head.querySelector('[data-disqus-embed="true"]')).toBe(pending_script)

    route_path.value = '/products/product-c'
    await wrapper_b.setProps({ contentId: 'product-c' })
    await flushPromises()

    // retry 不得注入第二份 embed.js
    expect(appended_scripts).toHaveLength(1)
    expect(document.head.querySelector('[data-disqus-embed="true"]')).toBe(pending_script)
  })

  it('既有 Disqus reset throw（embed 已執行）時保留 runtime 與 script，retry 不重載第三方 embed', async () => {
    const { wrapper, route_path } = mountDisqusThread()
    await nextTick()
    enterViewport()
    const failed_script = appended_scripts[0]

    const reset = vi.fn(() => {
      throw new Error('Disqus reset failed')
    })
    const disqus_window = window as Window & { DISQUS?: { reset: typeof reset } }
    disqus_window.DISQUS = { reset }
    route_path.value = PRODUCT_B_PATH
    await flushPromises()

    expect(reset).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    // embed.js 已執行：DISQUS runtime 與已執行的 script 一律保留，不重注入
    expect(disqus_window.DISQUS).toBeDefined()
    expect(document.head.querySelector('[data-disqus-embed="true"]')).toBe(failed_script)

    route_path.value = '/products/product-c'
    await flushPromises()

    expect(appended_scripts).toHaveLength(1)
    expect(document.head.querySelector('[data-disqus-embed="true"]')).toBe(failed_script)
  })

  it('前次載入失敗後在 await 窗口內連續切頁，滯後的 loadThread 不以舊 owner config reset', async () => {
    const { wrapper, route_path } = mountDisqusThread()
    await nextTick()
    enterViewport()

    // 觸發載入失敗 → fallback（load_failed 為 true，之後 retry 才會 await nextTick）
    const failed_script = appended_scripts[0]
    const on_error = failed_script?.onerror as ((event: Event) => unknown) | null
    on_error?.(new Event('error'))
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    // 第三方 runtime 就緒後，滯後的 loadThread 才有 DISQUS.reset 可誤觸
    const reset = vi.fn()
    const disqus_window = window as Window & { DISQUS?: { reset: typeof reset } }
    disqus_window.DISQUS = { reset }

    // gate 讓 B 的 retry loadThread 卡在 await nextTick，模擬「await 尚未 resolve」
    let release_b_await!: () => void
    next_tick_control.gate = new Promise<void>((resolve) => {
      release_b_await = resolve
    })

    // 切到 B → loadThread(owner_B) 進入 await 掛起（load_failed 已被清為 false）
    route_path.value = PRODUCT_B_PATH
    await wrapper.setProps({ contentId: 'product-b' })
    await flushPromises()

    // B 仍掛起時切到 C（owner 換手）→ C 因 load_failed 已 false 走同步 reset
    next_tick_control.gate = null
    route_path.value = '/products/product-c'
    await wrapper.setProps({ contentId: 'product-c' })
    await flushPromises()

    // 釋放 B 的 await：此時 owner 已是 C，滯後的 B loadThread 不得再以舊 config reset
    release_b_await()
    await flushPromises()

    const reset_identifiers = reset.mock.calls.map((call) => {
      const page = { page: { url: '', identifier: '' } }
      call[0].config.call(page)

      return page.page.identifier
    })

    expect(reset_identifiers.at(-1)).toBe('products/product-c')
    expect(reset_identifiers).not.toContain('products/product-b')
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
    const page = { page: { url: '', identifier: '' }, language: '' }
    reset_options.config.call(page)

    expect(reset_options.reload).toBe(true)
    expect(page.page).toEqual({
      url: getCanonicalUrl(PRODUCT_B_PATH),
      identifier: 'products/product-b',
    })
    expect(page.language).toBe('zh_TW')
  })
})
