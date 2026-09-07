// 量測 SPA 換頁耗時：首頁 → 詳情 → 返回（045 AC6）。用法：node scripts/perf/nav-timing.mjs [cpu_throttle]
// 環境變數：BASE_URL（預設正式站）、CHROME_PATH（預設 /usr/bin/google-chrome）。
// 情境：baseline / 移除所有 view-transition-name / 完全 fake 掉 startViewTransition / 保留 name 但關動畫。
// headless 為軟體 raster，絕對值偏大，只比情境間的相對值。agent-browser 分頁被背景節流（rAF≈1Hz），不可用於計時。
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'https://dwselect.applepig.net'
const SCENARIOS = {
  baseline: { css: '', js: '' },
  'no-names': { css: '*{view-transition-name:none!important}', js: '' },
  'vt-off': {
    css: '',
    js: 'document.startViewTransition=function(cb){const d=Promise.resolve().then(cb);return {ready:d,finished:d,updateCallbackDone:d,skipTransition(){}}}',
  },
  'no-anim': {
    css: '::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}',
    js: '',
  },
}

const cpu = Number(process.argv[2] ?? 1)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true })
const out = []
for (const [name, sc] of Object.entries(SCENARIOS)) {
  for (let run = 0; run < 3; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForFunction(() => {
      const app = document.getElementById('__nuxt')?.__vue_app__
      return app && app.$nuxt && app.$nuxt.isHydrating === false
    }, null, { timeout: 30000 })
    await page.waitForTimeout(800)
    const r = await page.evaluate(async ({ css, js }) => {
      if (css) {
        const s = document.createElement('style')
        s.textContent = css
        document.head.appendChild(s)
      }
      if (js) new Function(js)()
      const raf = await new Promise((res) => {
        const a = performance.now()
        requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - a))))
      })
      const names = [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).viewTransitionName !== 'none').length
      const waitFor = (pred) => new Promise((res) => {
        const iv = setInterval(() => {
          if (pred()) {
            clearInterval(iv)
            res()
          }
        }, 4)
        setTimeout(() => {
          clearInterval(iv)
          res()
        }, 8000)
      })
      const nextPaint = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      const t0 = performance.now()
      document.querySelectorAll('a[href^="/products/"]')[3].click()
      await waitFor(() => location.pathname.startsWith('/products/') && document.querySelector('[class*=detail]'))
      const dom = performance.now() - t0
      await nextPaint()
      const paint = performance.now() - t0
      // VT 動畫結束：等 ::view-transition pseudo 消失（用 getAnimations 判斷）
      await waitFor(() => document.getAnimations().length === 0)
      const settled = performance.now() - t0
      await new Promise((r) => setTimeout(r, 500))
      const t1 = performance.now()
      history.back()
      await waitFor(() => location.pathname === '/' && document.querySelectorAll('a[href^="/products/"]').length > 10)
      const backDom = performance.now() - t1
      await waitFor(() => document.getAnimations().length === 0)
      const backSettled = performance.now() - t1
      return { raf2frames: raf, names, dom: Math.round(dom), paint: Math.round(paint), settled: Math.round(settled), backDom: Math.round(backDom), backSettled: Math.round(backSettled) }
    }, sc)
    out.push({ scenario: name, cpu, run, ...r })
    await ctx.close()
  }
}
await browser.close()
console.table(out)
