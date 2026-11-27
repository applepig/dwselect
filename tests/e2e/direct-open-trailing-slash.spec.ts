import { expect, test } from '@playwright/test'

// 047：頁面 URL 全站帶尾斜線。Pages 只以 `/x/` 服務 `x/index.html`，`/x` 308 過去。
// 直接開頁時若 URL 與 prerender payload.path 不一致，Nuxt hydration 會 replace URL；Nuxt VT plugin 把只差
// 尾斜線的導航當換頁開 View Transition，卻等不到 page:finish，畫面凍結約 4 秒、點擊被吞。

type LoadProbe = {
  view_transitions: number
  finished_transitions: number
  aborted_transitions: number
  url_replacements: string[]
}

declare global {
  interface Window {
    __dw_load_probe: LoadProbe
    __dw_document_marker?: number
  }
}

// 在任何頁面 script 之前包住 startViewTransition 與 replaceState，記錄 VT 的啟動／結束與改 URL 的 replace。
async function installLoadProbe(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const probe: LoadProbe = { view_transitions: 0, finished_transitions: 0, aborted_transitions: 0, url_replacements: [] }
    window.__dw_load_probe = probe

    const start_view_transition = document.startViewTransition?.bind(document)
    if (start_view_transition) {
      document.startViewTransition = ((...args: Parameters<typeof start_view_transition>) => {
        probe.view_transitions += 1
        const transition = start_view_transition(...args)
        transition.finished.then(
          () => { probe.finished_transitions += 1 },
          () => { probe.aborted_transitions += 1 },
        )
        return transition
      }) as typeof document.startViewTransition
    }

    const replace_state = history.replaceState.bind(history)
    history.replaceState = (data, unused, url) => {
      if (url !== undefined && url !== null && new URL(url, location.href).href !== location.href) {
        probe.url_replacements.push(String(url))
      }
      return replace_state(data, unused, url)
    }
  })
}

async function waitForHydration(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as { __vue_app__?: { config: { globalProperties: { $nuxt?: { isHydrating?: boolean } } } } } | null)?.__vue_app__
    return app?.config.globalProperties.$nuxt?.isHydrating === false
  })
  // deferred route 的 replace 掛在 app:suspense:resolve 之後；多等一段，讓「載入期間」涵蓋它。
  await page.waitForTimeout(500)
}

// 凍結是卡到瀏覽器 4 秒逾時；時限取 3 秒，低於凍結門檻，又給真實 Pages preview 的冷 CDN 留餘裕。
const INTERACTIVE_TIMEOUT_MS = 3_000

// 點導覽「連結」必須是同一 document 的 client 導航，且在時限內完成（VT 凍結時點擊會被吞）；
// 這是真實換頁，View Transition 照常啟動並在時限內 finished，不被尾斜線防線誤關。
async function expectInstantClientNavigationToLinks(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    window.__dw_document_marker = Math.random()
  })
  const marker = await page.evaluate(() => window.__dw_document_marker)
  const before = await page.evaluate(() => ({ ...window.__dw_load_probe }))

  await page.locator('a[href="/links/"]:visible').first().click({ timeout: INTERACTIVE_TIMEOUT_MS })

  await expect(page).toHaveURL(/\/links\/$/, { timeout: INTERACTIVE_TIMEOUT_MS })
  expect(await page.evaluate(() => window.__dw_document_marker)).toBe(marker)
  await expect.poll(async () => {
    const after = await page.evaluate(() => window.__dw_load_probe)
    return {
      started: after.view_transitions - before.view_transitions,
      finished: after.finished_transitions - before.finished_transitions,
      aborted: after.aborted_transitions - before.aborted_transitions,
    }
  }, { timeout: INTERACTIVE_TIMEOUT_MS }).toEqual({ started: 1, finished: 1, aborted: 0 })
}

// 308 是靜態主機（Pages、serve-static-output）的目錄語意，dev server 沒有。CI 的靜態 preview 與 deploy
// preview 都以 PLAYWRIGHT_EXTERNAL_SERVER=1 跑，故只在對本機 dev server 跑時略過。
test('redirects the slashless URL to the trailing-slash page URL', async ({ request }) => {
  test.skip(process.env.PLAYWRIGHT_EXTERNAL_SERVER !== '1', 'only static hosts redirect directory paths')

  const response = await request.get('/guide', { maxRedirects: 0 })

  expect(response.status()).toBe(308)
  expect(new URL(response.headers().location ?? '', 'http://host').pathname).toBe('/guide/')
})

for (const path of ['/guide/', '/guide/2026-06-02-japanese-rice-intro/']) {
  test(`direct open of ${path} hydrates without URL replacement or view transition and stays interactive`, async ({ page }) => {
    await installLoadProbe(page)

    const response = await page.goto(path, { waitUntil: 'load' })

    expect(response?.status()).toBe(200)
    expect(response?.request().redirectedFrom()).toBeNull()
    await waitForHydration(page)
    expect(await page.evaluate(() => window.__dw_load_probe)).toMatchObject({ view_transitions: 0, url_replacements: [] })
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expectInstantClientNavigationToLinks(page)
  })
}

// 防線（middleware）：只差尾斜線的 forced 導航（Nuxt hydration deferred route 就是這種 replace）不得開 VT 凍結畫面。
// 一般 push 只差尾斜線時 vue-router 判定 duplicated 直接略過，故以 force 重現 Nuxt 內部的 replace。
test('a forced slashless replace to the same page does not start a view transition', async ({ page }) => {
  await installLoadProbe(page)
  await page.goto('/guide/', { waitUntil: 'load' })
  await waitForHydration(page)

  await page.evaluate(async () => {
    type Router = { replace: (to: { path: string, force: boolean }) => Promise<unknown> }
    const app = (document.querySelector('#__nuxt') as { __vue_app__?: { config: { globalProperties: { $router: Router } } } } | null)?.__vue_app__
    await app?.config.globalProperties.$router.replace({ path: '/guide', force: true })
  })

  await expect(page).toHaveURL(/\/guide$/)
  expect(await page.evaluate(() => window.__dw_load_probe.view_transitions)).toBe(0)
  await expectInstantClientNavigationToLinks(page)
})
