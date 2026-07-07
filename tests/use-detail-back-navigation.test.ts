import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDetailBackNavigation } from '../app/composables/use-detail-back-navigation'

interface RouterStub {
  back: ReturnType<typeof vi.fn>
  push: ReturnType<typeof vi.fn>
}

let router: RouterStub

// composable 依 Nuxt auto-import 的 useRouter；bare vitest 無 auto-import，以全域 stub 攔截，
// 比照既有 detail 元件測試的 vi.stubGlobal('useRouter', ...) 慣例。
function stubRouter() {
  router = { back: vi.fn(), push: vi.fn() }
  vi.stubGlobal('useRouter', () => router)
}

interface BrowserOptions {
  history_length?: number
  history_state_back?: unknown
  referrer?: string
  origin?: string
}

// 模擬 client 環境的 window／document；未指定時給「可返回上頁」的中性預設（history.length=2、同源 origin）。
function stubBrowser(options: BrowserOptions = {}) {
  vi.stubGlobal('window', {
    history: {
      length: options.history_length ?? 2,
      state: { back: options.history_state_back },
    },
    location: { origin: options.origin ?? 'https://dwselect.example' },
  })
  vi.stubGlobal('document', {
    referrer: options.referrer ?? '',
  })
}

describe('useDetailBackNavigation', () => {
  beforeEach(() => {
    stubRouter()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('在 SSR（無 window／document）時導向 fallback route，不呼叫 router.back', () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('document', undefined)

    useDetailBackNavigation('/').goBack()

    expect(router.back).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('history 只有一筆（length <= 1）時導向 fallback route', () => {
    stubBrowser({ history_length: 1 })

    useDetailBackNavigation('/').goBack()

    expect(router.back).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('history.state.back 是站內路徑（/ 開頭、非 //）時返回上頁', () => {
    stubBrowser({ history_state_back: '/products/sample' })

    useDetailBackNavigation('/').goBack()

    expect(router.back).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('history.state.back 是 protocol-relative（//）時視為外部，續看 referrer 而非直接返回', () => {
    stubBrowser({
      history_state_back: '//evil.example',
      referrer: 'https://external.test/page',
      origin: 'https://dwselect.example',
    })

    useDetailBackNavigation('/').goBack()

    expect(router.back).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('protocol-relative history.state.back 被拒後，referrer 同源仍可返回上頁', () => {
    stubBrowser({
      history_state_back: '//evil.example',
      referrer: 'https://dwselect.example/list',
      origin: 'https://dwselect.example',
    })

    useDetailBackNavigation('/').goBack()

    expect(router.back).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('無站內 history.state.back 且 referrer 為空時導向 fallback route', () => {
    stubBrowser({ referrer: '' })

    useDetailBackNavigation('/').goBack()

    expect(router.back).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('referrer 與當前站台同源時返回上頁', () => {
    stubBrowser({
      referrer: 'https://dwselect.example/list',
      origin: 'https://dwselect.example',
    })

    useDetailBackNavigation('/').goBack()

    expect(router.back).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('referrer 為外部站台時導向 fallback route', () => {
    stubBrowser({
      referrer: 'https://other.test/page',
      origin: 'https://dwselect.example',
    })

    useDetailBackNavigation('/').goBack()

    expect(router.back).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('referrer 為非法 URL 時導向 fallback route（catch 分支）', () => {
    stubBrowser({
      referrer: 'not a valid url',
      origin: 'https://dwselect.example',
    })

    useDetailBackNavigation('/').goBack()

    expect(router.back).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('fallback route 參數化為 / 時，無法返回上頁導向首頁', () => {
    stubBrowser({ referrer: '' })

    useDetailBackNavigation('/').goBack()

    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('fallback route 參數化為 /guide 時，無法返回上頁導向 guide 列表', () => {
    stubBrowser({ referrer: '' })

    useDetailBackNavigation('/guide').goBack()

    expect(router.push).toHaveBeenCalledWith('/guide')
  })
})
