// @vitest-environment happy-dom

import { flushPromises, mount, renderToString } from '@vue/test-utils'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ShareButtons from '../app/components/share-buttons.vue'
import { getCanonicalUrl } from '../app/utils/seo-metadata'

const UIconStub = { props: ['name'], template: '<i :data-icon="name" />' }

// 標題刻意含空白與 &：斷言 intent URL 的 text 參數必須經 URL-encode，不得裸串。
const PAGE_TITLE = '示範商品 A&B'
const ROUTE_PATH = '/products/sample-product'
// 預期值由 spec 契約推導（分享 URL＝getCanonicalUrl(route.path)，AC12），不寫死網域。
const CANONICAL_URL = getCanonicalUrl(ROUTE_PATH)
const ENCODED_URL = encodeURIComponent(CANONICAL_URL)
const ENCODED_TITLE = encodeURIComponent(PAGE_TITLE)

function mountShareButtons(options: { onAppError?: (error: unknown) => void } = {}) {
  return mount(ShareButtons, {
    props: { title: PAGE_TITLE },
    global: {
      stubs: { UIcon: UIconStub },
      config: options.onAppError === undefined ? {} : { errorHandler: options.onAppError },
    },
  })
}

describe('ShareButtons', () => {
  // share-buttons.vue 依賴 Nuxt auto-import 的 Vue API 與 useRoute；bare vitest 需 stub。
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('onUnmounted', onUnmounted)
    vi.stubGlobal('useRoute', () => ({ path: ROUTE_PATH }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('SSR 輸出恆為平台連結 fallback 結構，不受 navigator.share 存在影響（hydration 安全）', async () => {
    // 即使環境帶 navigator.share，server render 也不得切換結構——偵測只能發生在 onMounted 後。
    vi.stubGlobal('navigator', { share: vi.fn() })

    const html = await renderToString(ShareButtons, {
      props: { title: PAGE_TITLE },
      global: { stubs: { UIcon: UIconStub } },
    })

    expect(html).toContain('data-platform="line"')
    expect(html).toContain('data-platform="facebook"')
    expect(html).toContain('data-platform="x"')
    expect(html).toContain('data-platform="threads"')
    expect(html).not.toContain('share-main-button')
  })

  it('掛載後偵測到 navigator.share，改示主分享鈕並收起平台連結（AC9）', async () => {
    vi.stubGlobal('navigator', { share: vi.fn() })

    const wrapper = mountShareButtons()
    await nextTick()

    expect(wrapper.find('.share-main-button').exists()).toBe(true)
    expect(wrapper.find('.share-platform-link').exists()).toBe(false)
  })

  it('點主分享鈕以 canonical URL 與頁面標題呼叫 navigator.share（AC9、AC12）', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })

    const wrapper = mountShareButtons()
    await nextTick()
    await wrapper.find('.share-main-button').trigger('click')

    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith({ title: PAGE_TITLE, url: CANONICAL_URL })
  })

  it('使用者取消分享面板（AbortError）時靜默返回，不往外拋錯', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('使用者取消', 'AbortError'))
    const on_app_error = vi.fn()
    vi.stubGlobal('navigator', { share })

    const wrapper = mountShareButtons({ onAppError: on_app_error })
    await nextTick()
    await wrapper.find('.share-main-button').trigger('click')
    await flushPromises()

    expect(share).toHaveBeenCalledTimes(1)
    expect(on_app_error).not.toHaveBeenCalled()
  })

  it('無 navigator.share 時顯示四平台鈕，href 為 spec intent 模板＋URL-encoded canonical（AC10）', async () => {
    vi.stubGlobal('navigator', {})

    const wrapper = mountShareButtons()
    await nextTick()

    // canonical 的 :// 必須被編碼——確保斷言的是 encode 後的值，不是裸 URL 恰好相同。
    expect(ENCODED_URL).toContain('%3A%2F%2F')

    const hrefs = Object.fromEntries(
      wrapper.findAll('.share-platform-link').map((link) => [link.attributes('data-platform'), link.attributes('href')]),
    )

    expect(hrefs).toEqual({
      line: `https://social-plugins.line.me/lineit/share?url=${ENCODED_URL}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${ENCODED_URL}`,
      x: `https://twitter.com/intent/tweet?url=${ENCODED_URL}&text=${ENCODED_TITLE}`,
      threads: `https://www.threads.net/intent/post?text=${ENCODED_TITLE}%20${ENCODED_URL}`,
    })
    expect(wrapper.find('.share-main-button').exists()).toBe(false)
  })

  it('平台鈕開新分頁且帶 noopener noreferrer', async () => {
    vi.stubGlobal('navigator', {})

    const wrapper = mountShareButtons()
    await nextTick()
    const line_link = wrapper.find('.share-platform-link[data-platform="line"]')

    expect(line_link.attributes('target')).toBe('_blank')
    expect(line_link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('點 copy link 把 canonical URL 寫入剪貼簿並短暫顯示已複製，約 2 秒後復原（AC11）', async () => {
    vi.useFakeTimers()
    const write_text = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText: write_text } })

    const wrapper = mountShareButtons()
    const copy_button = wrapper.find('.share-copy-button')

    expect(copy_button.text()).toContain('複製連結')

    await copy_button.trigger('click')
    await vi.advanceTimersByTimeAsync(0)

    expect(write_text).toHaveBeenCalledWith(CANONICAL_URL)
    expect(copy_button.text()).toContain('已複製')

    await vi.advanceTimersByTimeAsync(2000)

    expect(copy_button.text()).toContain('複製連結')
  })

  it('回饋期間重複點擊會重啟計時，復原自最後一次點擊起算（AC11）', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

    const wrapper = mountShareButtons()
    const copy_button = wrapper.find('.share-copy-button')

    await copy_button.trigger('click')
    await vi.advanceTimersByTimeAsync(1500)
    await copy_button.trigger('click')
    await vi.advanceTimersByTimeAsync(1500)

    // 第一次點擊起算已過 3 秒，但第二次點擊重啟計時，回饋仍在。
    expect(copy_button.text()).toContain('已複製')

    await vi.advanceTimersByTimeAsync(500)

    expect(copy_button.text()).toContain('複製連結')
  })

  it('clipboard API 不存在（非 secure context）時顯示可手動選取的 canonical URL，不靜默失敗（Case 4）', async () => {
    vi.stubGlobal('navigator', {})

    const wrapper = mountShareButtons()
    await wrapper.find('.share-copy-button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.share-copy-fallback').exists()).toBe(true)
    expect(wrapper.find('.share-copy-fallback-url').text()).toBe(CANONICAL_URL)
    expect(wrapper.find('.share-copy-button').text()).toContain('複製連結')
  })

  it('clipboard 寫入被拒（權限拒絕）時同樣顯示 URL fallback（Case 4）', async () => {
    const write_text = vi.fn().mockRejectedValue(new DOMException('權限拒絕', 'NotAllowedError'))
    const on_app_error = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText: write_text } })

    const wrapper = mountShareButtons({ onAppError: on_app_error })
    await wrapper.find('.share-copy-button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.share-copy-fallback-url').text()).toBe(CANONICAL_URL)
    expect(on_app_error).not.toHaveBeenCalled()
  })
})
