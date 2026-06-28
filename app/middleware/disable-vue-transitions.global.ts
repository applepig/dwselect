// 兩套換頁動畫並存（Vue pageTransition 的 compact-page-fade out-in 與 View Transition API）會讓
// 卡片圖 → 詳情 hero 的 morph 落空：out-in 會延後新頁掛載，VT 拍 new 快照時詳情 hero 尚未在場。
// 當瀏覽器支援 VT 且 flag 啟用時，把本次導航的 Vue transition 關掉，讓同一次換頁只有 VT 一套系統作用；
// 否則（不支援／flag-off）保留 Vue compact-page-fade 作為 graceful 退化路徑（AC1／AC2／ADR-1）。

// 是否把本次換頁交給 View Transition 接手——flag 與瀏覽器支援度兩者皆真才成立。
// 抽成純函式以 function-level unit test 涵蓋 flag × support 矩陣（AC2）。
export function shouldHandOverToViewTransition(
  enable_view_transition: boolean,
  start_view_transition: unknown,
): boolean {
  return enable_view_transition === true && typeof start_view_transition === 'function'
}

export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) {
    return
  }

  // SSOT：只讀 appConfig（build-time 烤入、非 env-overridable），不 import nuxt.config.ts（AC2）。
  // 不用 runtimeConfig.public——後者會被 NUXT_PUBLIC_* env 單邊覆寫，與 build-time only 的
  // experimental.viewTransition 不對稱，會讓 flag drift／雙動畫互打復活。
  const enable_view_transition = useAppConfig().enableViewTransition === true

  if (!shouldHandOverToViewTransition(enable_view_transition, document.startViewTransition)) {
    return
  }

  to.meta.pageTransition = false
  to.meta.layoutTransition = false
  from.meta.pageTransition = false
  from.meta.layoutTransition = false
})
