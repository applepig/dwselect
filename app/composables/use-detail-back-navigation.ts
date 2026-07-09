// detail 頁返回鈕的共用行為：product/guide 兩頁原本逐字複製同一段 same-origin 判定＋fallback，
// 收斂成單一 composable，fallback route 參數化（product '/'、guide '/guide'）。
export function useDetailBackNavigation(fallback_route: string): { goBack: () => void } {
  const router = useRouter()

  function goBack() {
    if (canReturnToSameOriginPage()) {
      router.back()

      return
    }

    router.push(fallback_route)
  }

  return { goBack }
}

// same-origin 判定：history.state.back 優先於 document.referrer；protocol-relative（//）referrer 視為外部（Case 3）。
function canReturnToSameOriginPage(): boolean {
  // composable 可能在 SSR 求值；無 window/document 時視為無法返回上頁，走 fallback（原元件以 import.meta.client 守此界，
  // 抽出後改以 runtime window/document 存在性判定，行為等價且可在測試環境操控）。
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  if (window.history.length <= 1) {
    return false
  }

  const previous_route = window.history.state?.back

  if (typeof previous_route === 'string' && previous_route.startsWith('/') && !previous_route.startsWith('//')) {
    return true
  }

  if (document.referrer === '') {
    return false
  }

  try {
    return new URL(document.referrer).origin === window.location.origin
  }
  catch {
    return false
  }
}
