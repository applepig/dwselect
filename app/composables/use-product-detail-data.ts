import type { ProductDetailView } from '../utils/public-content-view-types'
import { fetchProductDetail } from '../utils/fetch-product-detail'

// 028 拆分：詳情頁只 fetch 自己那一筆 detail（per-id key，獨立 cache），不再載入整包 content payload。
// id 不存在時 per-id route 回 404、$fetch reject，data 維持 null → 詳情頁 throw createError(404)。
export async function useProductDetailData(product_id: string) {
  const { data: product_detail } = await useAsyncData(
    `product-detail-${product_id}`,
    () => fetchProductDetail(product_id),
  )

  return computed<ProductDetailView | null>(() => product_detail.value ?? null)
}
