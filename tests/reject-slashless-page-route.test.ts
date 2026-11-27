import { describe, expect, it } from 'vitest'

import { rejectSlashlessPageRoute } from '../scripts/reject-slashless-page-route'

// 047：Nitro 以 route 字串去重，`/guide` 與 `/guide/` 都寫進 guide/index.html，後寫者決定 payload.path。
// 無斜線的 HTML 頁一旦混進 prerender（crawler、router 靜態路由），payload.path 與 Pages 服務的 `/guide/` 不一致，
// hydration 會 replace URL、View Transition 凍結。這類 route 必須讓 generate 失敗。
describe('rejectSlashlessPageRoute', () => {
  it.each([
    ['/guide', 'guide/index.html'],
    ['/products/a', 'products/a/index.html'],
  ])('should mark the html page route %s as a prerender error', (route, fileName) => {
    const prerender_route: { route: string, fileName: string, error?: Error } = { route, fileName }

    rejectSlashlessPageRoute(prerender_route)

    expect(prerender_route.error?.message).toContain(route)
  })

  it.each([
    ['/', 'index.html'],
    ['/guide/', 'guide/index.html'],
    ['/api/content.json', 'api/content.json'],
    ['/guide/a/_payload.json', 'guide/a/_payload.json'],
    ['/_ipx/f_webp/products/images/a.png', '_ipx/f_webp/products/images/a.png'],
    ['/200.html', '200.html'],
    ['/404.html', '404.html'],
  ])('should leave %s untouched', (route, fileName) => {
    const prerender_route: { route: string, fileName: string, error?: Error } = { route, fileName }

    rejectSlashlessPageRoute(prerender_route)

    expect(prerender_route.error).toBeUndefined()
  })
})
