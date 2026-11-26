# 047 Spec：全站 trailing slash ＋ Nuxt 升級，根治直接開頁凍結

**目標**：直接開啟任何頁面都不凍結。頁面 URL 全站統一為 `/x/`，與 Cloudflare Pages 目錄輸出及既有 `/x → /x/` 308 方向一致。Nuxt 升到含 PR #36050 的最新 4.x。

**非目標**：反轉 308 方向、`Clear-Site-Data`、搬遷到 Workers、更改 Disqus identifier。

**AC**
1. Nuxt 升到最新穩定 4.x（≥4.6，含 #36050）。相依套件同步，全套 gate 綠：test／lint／knip／typecheck／generate，以及 Pages 模擬器上的 E2E。
2. 非首頁 HTML 頁只輸出 `x/index.html`，其 `payload.path` 為 `/x/`。不再輸出扁平 `x.html`，也不再複製檔案。
3. 頁面 URL 一律帶斜線，涵蓋：NuxtLink、程式導航（`router.push`／`navigateTo`）、canonical、OG、分享、sitemap、llms、搜尋 index href。`/` 與非頁面 URL 不變：`/api/*.json`、`/_ipx/*`、圖片、discovery 檔。RSS `<guid>` 維持舊字串，避免閱讀器把舊文當新文。
4. generate 防線：任何非首頁 HTML route 不帶尾斜線時，generate 失敗（例如 crawler 自動加入的 `/guide`）。
5. 在 Pages 模擬器上直接開 `/x/`：回 200，載入期間不 replace URL、不啟動 View Transition，hydration 後立即可點。`/x` 會 308 到 `/x/`。
6. `/guide/`、`/links/`、`/search/`、詳情頁的麵包屑與導覽 active 狀態正確，比對路徑時容許尾斜線。
7. 保留只差尾斜線就關閉 VT 的 middleware，作為 Nuxt `isChangingPage` 缺陷的防線；站內真實換頁仍有 VT。
8. 搜尋結果商品圖可載入（顯式 prerender），圖片檔名在 URL 邊界正確編碼（含 `%`）。
9. `serve-static-output.ts` 回到目錄語意：`/x` 308 到 `/x/`，保留 query；Location 用未 decode 的 pathname。

**ADR**：選全站帶斜線，不選無斜線。只有帶斜線沿用既有 308 方向，不會讓快取舊轉址的回訪者陷入轉址迴圈；也不需要雙輸出（xreview 六位 reviewer 一致）。
