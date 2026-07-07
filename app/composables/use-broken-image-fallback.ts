// 破圖 fallback 的共用狀態：product/guide detail 與 resource-list 三處原本各自維護
// 「失敗 id → 隱藏 img → placeholder icon」同一 pattern，收斂成單一 Set-based composable。
// onImageError 直接對 reactive Set 呼叫 .add（Vue 3.5 已 instrument 集合方法，O(1) 觸發 .has 依賴更新）。
// scanForBrokenImage 補偵測「掛載時已載入即失敗」的圖：這類圖的 <img @error> 不會再觸發，
// onMounted 掃 root 內單張符合 selector 的圖，complete 但 naturalWidth 為 0 即判定破圖。
// param 用 structural type（Pick<ParentNode, 'querySelector'>）而非 nominal HTMLElement／ParentNode——
// vue-tsc 把 template ref 讀取合成為被 DOM view-transition augmentation 撐大的巨大 structural 型別，
// 對 nominal DOM param 不可指派（TS2345）；structural-to-structural 只需 querySelector member 匹配即通過。
export function useBrokenImageFallback(): {
  isBrokenImage: (id: string) => boolean
  onImageError: (id: string) => void
  scanForBrokenImage: (root: Pick<ParentNode, 'querySelector'> | null, selector: string, id: string) => void
} {
  const failed_image_ids = ref<Set<string>>(new Set())

  function isBrokenImage(id: string): boolean {
    return failed_image_ids.value.has(id)
  }

  function onImageError(id: string) {
    failed_image_ids.value.add(id)
  }

  function scanForBrokenImage(root: Pick<ParentNode, 'querySelector'> | null, selector: string, id: string) {
    const image = root?.querySelector<HTMLImageElement>(selector) ?? null

    if (image !== null && image.complete && image.naturalWidth === 0) {
      onImageError(id)
    }
  }

  return { isBrokenImage, onImageError, scanForBrokenImage }
}
