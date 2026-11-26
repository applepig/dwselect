type PrerenderRoute = {
  route: string
  fileName?: string
  error?: Error
}

// Why（047）：頁面 URL 全站帶尾斜線，Pages 只以 `/x/` 服務 `x/index.html`。Nitro 以 route 字串去重，
// 無斜線的 `/x` 也會寫進同一個 `x/index.html` 並覆寫 payload.path；hydration 會因此 replace URL、
// View Transition 凍結。在 prerender:generate 把「無斜線卻寫成資料夾 index 的 route」標成錯誤，
// 搭配 failOnError 讓 generate 直接失敗。
export function rejectSlashlessPageRoute(prerender_route: PrerenderRoute): void {
  const { route, fileName } = prerender_route

  if (route.endsWith('/') || !fileName?.endsWith('index.html')) {
    return
  }

  prerender_route.error = new Error(`Page route must end with a trailing slash: ${route}`)
}
