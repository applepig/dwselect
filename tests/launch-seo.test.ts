import { existsSync } from 'node:fs'

import { renderToString } from '@vue/test-utils'
import { computed } from 'vue'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
  getCanonicalUrl,
  getSeoDescription,
} from '../app/utils/seo-metadata'
import ErrorPage from '../app/error.vue'

const project_root_url = new URL('../', import.meta.url)

describe('launch SEO static assets', () => {
  it('should provide local brand assets and remove the Vite template entrypoint', () => {
    expect(existsSync(new URL('public/favicon.ico', project_root_url))).toBe(true)
    expect(existsSync(new URL('public/og-image.png', project_root_url))).toBe(true)
    expect(existsSync(new URL('index.html', project_root_url))).toBe(false)
  })
})

describe('launch SEO metadata contract', () => {
  it('should define the approved site-level SEO constants with the production URL', () => {
    expect(SITE_URL).toBe('https://dwselect.applepig.net/')
    expect(SITE_NAME).toBe('DW嚴選')
    expect(SITE_DESCRIPTION).toBe('值得買、值得看、值得收藏的選物清單。')
    expect(SITE_TITLE).toBe('DW嚴選｜值得買、值得看、值得收藏的選物清單')
    expect(SITE_OG_IMAGE).toBe('https://dwselect.applepig.net/og-image.png')
  })

  it('should never leak the local dev host into the production SEO constants', () => {
    // 各頁 canonical／og 都改用這些常數，守住常數即守住實際輸出。
    expect(SITE_URL).not.toContain('toybox.local')
    expect(SITE_OG_IMAGE).not.toContain('toybox.local')
  })

  it('should resolve canonical URLs to absolute production URLs', () => {
    expect(getCanonicalUrl('')).toBe(SITE_URL)
    expect(getCanonicalUrl('/')).toBe(SITE_URL)
    expect(getCanonicalUrl('/products/foo')).toBe('https://dwselect.applepig.net/products/foo')
    expect(getCanonicalUrl('/guide')).toBe('https://dwselect.applepig.net/guide')
  })

  it('should fall back to the site description only when the input is blank', () => {
    expect(getSeoDescription('')).toBe(SITE_DESCRIPTION)
    expect(getSeoDescription('   ')).toBe(SITE_DESCRIPTION)
    expect(getSeoDescription('  摘要  ')).toBe('摘要')
  })
})

describe('launch SEO error page', () => {
  beforeAll(() => {
    // error.vue 依賴 Nuxt auto-import 的 computed 與 clearError；bare vitest 無 auto-import，需 stub。
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('clearError', vi.fn())
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  function renderErrorPage(status_code: number) {
    return renderToString(ErrorPage, {
      props: { error: { statusCode: status_code } as never },
      global: {
        stubs: {
          UApp: { template: '<div><slot /></div>' },
          NuxtLayout: { template: '<div><slot /></div>' },
          NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        },
      },
    })
  }

  it('should show a friendly not-found title and a home action for 404', async () => {
    const html = await renderErrorPage(404)

    expect(html).toContain('找不到頁面')
    expect(html).toContain('回首頁')
    expect(html).toContain('href="/"')
  })

  it('should show a generic error title for non-404 status codes', async () => {
    const html = await renderErrorPage(500)

    expect(html).toContain('發生錯誤')
    expect(html).toContain('回首頁')
  })
})
