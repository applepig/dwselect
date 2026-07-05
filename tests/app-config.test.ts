import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import nuxt_config from '../nuxt.config'

// app.config.ts 用 Nuxt auto-import 的全域 defineAppConfig（identity），
// bare vitest 無此全域；在模組 import 前 stub 成 identity，讀出的 default export 即 resolved config。
vi.hoisted(() => {
  vi.stubGlobal('defineAppConfig', <T>(config: T): T => config)
})

const app_config = (await import('../app.config')).default

describe('Nuxt UI app.config theme baseline', () => {
  it('should map primary and neutral colour aliases to Tailwind palette names', () => {
    expect(app_config.ui?.colors?.primary).toBe('orange')
    expect(app_config.ui?.colors?.neutral).toBe('stone')
  })

  it('should preserve the variables.css --ui-primary override on --dw-accent', () => {
    const variables_css = readFileSync(
      new URL('../app/assets/styles/variables.css', import.meta.url),
      'utf8',
    )

    // Nuxt UI 的 --ui-primary 一律導向 DW accent token（indirection 契約），
    // 具體 accent 色值屬視覺數值、改色不算行為變更，不 pin exact hex。
    expect(variables_css).toContain('--ui-primary: var(--dw-accent)')
    expect(variables_css).toContain('--dw-accent')
  })
})

describe('Nuxt app head tracking baseline', () => {
  // 以內容特徵 find 對應 entry，不寫死陣列位置——日後 head 前面插入其他 script/noscript 不應誤紅。
  it('should install the Google Tag Manager head script with the approved container ID', () => {
    const gtm_script = nuxt_config.app?.head?.script
      ?.find((entry) => entry?.innerHTML?.includes('gtm.start'))
      ?.innerHTML ?? ''

    expect(gtm_script).toContain('gtm.start')
    expect(gtm_script).toContain('googletagmanager.com/gtm.js')
    expect(gtm_script).toContain('GTM-KTZKC8CH')
  })

  it('should install the Google Tag Manager noscript fallback at the start of body', () => {
    const gtm_noscript = nuxt_config.app?.head?.noscript
      ?.find((entry) => entry?.innerHTML?.includes('googletagmanager.com/ns.html'))

    expect(gtm_noscript?.innerHTML).toContain('googletagmanager.com/ns.html?id=GTM-KTZKC8CH')
    expect(gtm_noscript?.tagPosition).toBe('bodyOpen')
  })
})
