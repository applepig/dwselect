// 「目前 active 的商品」：只有這一個商品的卡片會掛 view-transition-name，其餘卡片靜止時不掛，
// 省下每次換頁為全部卡片拍快照的成本（045 ADR）。放 useState 而非 DOM 事件內臨時掛 style，
// 是因為從詳情頁返回列表時，卡片要在 new 快照前就帶 name——只有「詳情頁登記 id、列表依 id render」做得到。
export function useActiveViewTransitionProduct() {
  const active_product_id = useState<string | null>('active-view-transition-product', () => null)

  function activate(product_id: string) {
    active_product_id.value = product_id
  }

  return {
    active_product_id: readonly(active_product_id),
    activate,
  }
}
