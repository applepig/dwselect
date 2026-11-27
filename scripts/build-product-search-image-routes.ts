import { encodePath } from 'ufo'

import { resolveProductImageUrl } from '../app/utils/content-images/resolve-product-image-url.ts'
import { readPublishedJsonEntries } from './content-source/read-published-json-entries.ts'

// Why: 搜尋結果的商品列只在 client render（/search prerender 時沒有 q），`resource-list` 的
// <NuxtImg format="webp"> 請求的 `/_ipx/f_webp/<image>` 不出現在任何 prerender HTML，ipxStatic 不會產出，
// 正式站因此 404 破圖。這裡依 published 商品顯式列進 prerender routes。
// 檔名用 ipxStatic provider 同一個 ufo encodePath 編碼：URL 與前端請求一致，且 Nitro prerender 的
// decodeURI 不會因檔名含 `%` 拋 URIError。
// 這段在 nuxt.config 載入時就會跑（含 CI 的 pnpm install → nuxt prepare），錯誤須帶出是哪一筆商品。
export function buildProductSearchImageRoutes(products_dir: string): string[] {
  return readPublishedJsonEntries(products_dir).map(({ file_name, data }) => {
    try {
      return `/_ipx/f_webp${encodePath(resolveProductImageUrl(data as { image_file?: string | null }))}`
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Cannot build search image route for product ${file_name}: ${reason}`, { cause: error })
    }
  })
}
