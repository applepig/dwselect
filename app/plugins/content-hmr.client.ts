import { resetClientSearchIndex } from '../utils/search/client-search'

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.hot) {
    return
  }

  // hot.on callback 由 websocket 訊息觸發，跑在 Nuxt async context 之外；
  // refreshNuxtData 內部會 useNuxtApp()，若不用 runWithContext 包住會丟 "nuxt instance unavailable"，
  // 刷新靜默失敗、已開頁面拿不到最新 content。
  // 028 拆分後詳情頁改用 product-detail-${id} / guide-detail-${id} per-id key，
  // 只刷 public-content 會讓開著的詳情頁標題/價格/pills 停在舊值；無參數 refreshNuxtData 刷全部 cache。
  import.meta.hot.on('dwselect:content-updated', () => {
    resetClientSearchIndex()
    nuxtApp.runWithContext(() => refreshNuxtData())
  })
})
