import type { ProductDetailView } from './public-content-view-types'

// per-id detail fetch：與 fetchPublicContentPayload 同樣走 universal $fetch，server／client 同源。
// route 在 generate 時 prerender 成 static /api/products/{id}.json；id 不存在時 route 回 404，
// $fetch 會 reject，由詳情頁的 useAsyncData error 路徑接手（維持既有 throw createError(404) 行為）。
export async function fetchProductDetail(id: string): Promise<ProductDetailView> {
  return await $fetch<ProductDetailView>(`/api/products/${id}.json`)
}
