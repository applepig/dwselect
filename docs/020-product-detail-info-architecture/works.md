# Works

## 2026-06-16

- 初始觀察：以 agent-browser 檢查 `ADATA 行動電源` 詳情頁 mobile 與 desktop，確認 back button 視覺位置需要調整，detail 資訊順序也需要整理。
- 初始誤判：曾假設「AI 怎麼說」可用 runtime `detail.description`，但使用者提醒 `content/AGENTS.md` 已明確定義 `summary`／`long_description`／`llm_description` 責任分工。
- 資料流確認：`product_schema` 與 `public/api/content.json` 皆保留 `summary`、`long_description`、`llm_description`；問題集中在 runtime view model 將 `summary` 改名為 `dw_says`、將 `long_description` 改名為 `description`，且沒有把 `llm_description` 帶入 detail UI contract。
- 內容現況統計：62 筆 product 目前皆有 `summary` 與 `long_description`，但 62 筆皆為 `summary === long_description`，且 `llm_description` 皆為空字串。這是既有資料尚未重新填充，不應成為 runtime mapping 模糊化的理由。
- 架構決策：本 sprint 不只修 detail UI，而是先整理 build-time frontend-ready payload，讓 SSG build process 產生 home card、detail、related products、navigation 所需 payload，Nuxt runtime 不再做多層 product mapping。
- 文件更新：重寫 `spec.md`，將 scope 定義為 frontend-ready product payload 與 detail IA，並明確禁止 `dw_says`／泛用 `description` 回歸。
- Bad smell review（`/simplify`，4-agent 平行）：派 reuse／simplification／efficiency／altitude 四個獨立 agent 審整條 product → UI 資料流。結論——spec 020 對 GPT 過度抽象的診斷正確且被坐實（raw `Product[]` payload、`dw_says`／`description` 改名、`PublishedProductCard` 撐三用途塞 placeholder、fallback search 依賴模糊 `description`、related／navigation runtime 重算）。已抽查實際程式碼確認非幻覺：`product-detail-payload.ts:24-28` 確實塞 `description:null`／`purchase_link:''`；`compareNullableTimestampDesc` 4 份、product id 抽取 3 份、`dw_says` 滲透 4 處、三個 composable 三把 cache key。
- 額外 findings（原 scope 外，已補進 spec「Additional Bad Smells」）：共用 helper 重複（comparators／id 抽取／`compareText`／`getPrimaryOffer`／image resolver／label map）、composable cache key 分歧、build script 雙讀、`isPublished` 散落。校正：62 筆 product，成本在語意與維護性而非效能，不以效能為修復理由。
- 決策（使用者）：將額外 findings 補進 020 Milestones 後直接派工執行。Milestones 由 5 條擴為 7 條：M1 共用 helper 收斂、M2 build-time payload mapper、M3 runtime 改讀 payload＋統一 cache key、M4 build script 去重、M5 detail UI IA、M6 tests、M7 gates＋agent-browser。
### M1 完成

- 新建 `app/utils/content/`：`extract-content-id.ts`、`compare-nullable-timestamp-desc.ts`、`compare-text.ts`、`primary-offer.ts`、`compare-products.ts`（canonical category→date→name）、`compare-guides.ts`（canonical date→name）。中性資料夾讓 `published-products` 與 `search-index` 都能乾淨 import，不互相耦合。
- 去重成果：`compareNullableTimestampDesc` 4→1、id 抽取 3→1、`compareProducts`／`compareGuides` 同名不同行為 2→1 canonical；search-index 改用 `extractContentId`／`getPrimaryOffer`／canonical comparator。淨刪約 104 行。
- 行為變更落地：search-index `documents` 商品 baseline 順序改為 category→date→name；guide tie-break 改 `compareText`。`tests/search-index.test.ts` 於 Red 階段新增測試 pin 新順序（註明 ADR 2026-06-16）。
- `compare-products.ts` 內聯 category sort_order fallback（找不到回 `Number.MAX_SAFE_INTEGER`），避免 `content/` 反向依賴 `published-products`；屬刻意的小重複，記錄於此。
- Deferred 至 M2：image resolver（行為不同，search 版 null 會 throw）、taxonomy label map（find-based vs Map-based）、`getProductTagLabel`/`getContentTagLabel` brands fallback 差異。
- 驗收：Coordinator 實跑 `APP_URL=… pnpm test` → 40 files / 302 tests passed；`pnpm typecheck`、`pnpm lint` 皆 exit 0。未 commit。
- 環境註記：不帶 `APP_URL` 時 `nuxt-smoke`／`view-transition` 等 3 file 會於 import `nuxt.config.ts` 時 throw（commit `2a6db5d` 移除 localhost fallback 的既有行為），與本次無關；測試須帶 `APP_URL` 執行。

### M1 範圍校正（使用者指正）：同名不同行為的 `compareProducts`／`compareGuides` 也是 bad smell，不該放著。查證：search-index 的 `compareProducts` 排 date→name 並進 `documents` summary，等於搜尋 baseline 顯示順序；catalog 端是 category→date→name。使用者裁定「統一成單一 canonical comparator」而非改名保留差異——product 統一 category→date→name、guide date→name、tie-break 統一 `compareText`。**後果：搜尋 baseline 商品順序會改變（user-visible）**；search-index 既有測試需在 Red 階段更新為新順序，屬刻意行為變更，非 Green 階段作弊。
