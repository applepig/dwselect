import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// middleware 以 export default defineNuxtRouteMiddleware(handler) 定義；defineNuxtRouteMiddleware 是
// Nuxt auto-import，bare vitest 無此 global，故先 stub 成 identity 再 import，取得未包裝的 handler 做
// function-level 驗收（AC2：flag × VT support 矩陣，只有 true+supported 會關閉 Vue transition）。
type RouteStub = { path?: string, meta: Record<string, unknown> }
let runMiddleware: (to: RouteStub, from: RouteStub) => void
let shouldHandOverToViewTransition: (enable: boolean, start_view_transition: unknown) => boolean

beforeAll(async () => {
  vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
  const mod = await import('../app/middleware/disable-vue-transitions.global')
  runMiddleware = mod.default as typeof runMiddleware
  shouldHandOverToViewTransition = mod.shouldHandOverToViewTransition
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setEnvironment(flag_enabled: boolean, vt_supported: boolean) {
  vi.stubGlobal('useAppConfig', () => ({ enableViewTransition: flag_enabled }))
  vi.stubGlobal('document', vt_supported ? { startViewTransition: () => {} } : {})
}

describe('shouldHandOverToViewTransition (flag × support matrix)', () => {
  it('should hand over only when the flag is on and the browser supports view transitions', () => {
    expect(shouldHandOverToViewTransition(true, () => {})).toBe(true)
  })

  it('should not hand over when the browser lacks document.startViewTransition', () => {
    expect(shouldHandOverToViewTransition(true, undefined)).toBe(false)
  })

  it('should not hand over when the flag is off even on a supporting browser', () => {
    expect(shouldHandOverToViewTransition(false, () => {})).toBe(false)
  })

  it('should not hand over when both the flag is off and support is missing', () => {
    expect(shouldHandOverToViewTransition(false, undefined)).toBe(false)
  })
})

describe('disable-vue-transitions middleware', () => {
  it('should disable both Vue page and layout transitions when VT is enabled and supported (AC1)', () => {
    setEnvironment(true, true)
    const to: RouteStub = { meta: {} }
    const from: RouteStub = { meta: {} }

    runMiddleware(to, from)

    expect(to.meta.pageTransition).toBe(false)
    expect(to.meta.layoutTransition).toBe(false)
    expect(from.meta.pageTransition).toBe(false)
    expect(from.meta.layoutTransition).toBe(false)
  })

  it('should leave Vue transitions intact when the browser does not support view transitions (Case 1)', () => {
    setEnvironment(true, false)
    const to: RouteStub = { meta: {} }

    runMiddleware(to, { meta: {} })

    expect(to.meta.pageTransition).toBeUndefined()
    expect(to.meta.layoutTransition).toBeUndefined()
  })

  it('should leave Vue transitions intact when the flag is off so navigation is never left with no animation (AC2, Case 2)', () => {
    setEnvironment(false, true)
    const to: RouteStub = { meta: {} }

    runMiddleware(to, { meta: {} })

    expect(to.meta.pageTransition).toBeUndefined()
    expect(to.meta.layoutTransition).toBeUndefined()
  })
})

// 047：只差尾斜線的導航（`/x` ↔ `/x/`）不是換頁；Nuxt isChangingPage 卻會開 View Transition，
// NuxtPage 不重 render、page:finish 不觸發，畫面凍結到瀏覽器 4 秒逾時。
describe('disable-vue-transitions middleware on trailing-slash-only navigation', () => {
  it.each([
    ['/guide/2026-06-02-japanese-rice-intro', '/guide/2026-06-02-japanese-rice-intro/'],
    ['/guide/2026-06-02-japanese-rice-intro/', '/guide/2026-06-02-japanese-rice-intro'],
    ['/guide', '/guide/'],
  ])('should skip the view transition when navigating to %s from %s', (to_path, from_path) => {
    setEnvironment(true, true)
    const to: RouteStub = { path: to_path, meta: {} }

    runMiddleware(to, { path: from_path, meta: {} })

    expect(to.meta.viewTransition).toBe(false)
  })

  it.each([
    ['/guide/2026-06-02-japanese-rice-intro', '/guide/'],
    ['/products/a', '/'],
    ['/', '/links/'],
  ])('should keep the view transition for a real page change to %s from %s', (to_path, from_path) => {
    setEnvironment(true, true)
    const to: RouteStub = { path: to_path, meta: {} }

    runMiddleware(to, { path: from_path, meta: {} })

    expect(to.meta.viewTransition).toBeUndefined()
  })
})
