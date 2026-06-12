# Sprint 010：圖片本地化與 Code Quality 整理

## 目標

把商品與指南目前外連的圖片下載進 repo（存 `content/` 跟著內容資料走），由本站自行 serve，消除外部 CDN 失效造成的破圖風險；同時清理累積的 code quality 債：拆分 `published-products.ts`（1036 行）與 `search.vue`（448 行）、收斂 taxonomy 定義為單一來源、歸檔 legacy migration scripts、補 `package.json` engines 欄位。

## 非目標

- 不做圖片壓縮、resize、WebP 轉換或 Nuxt Image 整合（圖量小，留待未來有需求再做）。
- 不用 Git LFS（約 64 張小圖，直接 commit）。
- 不改 UI 視覺與互動行為——本 sprint 所有 refactor 對使用者不可見，現有 E2E 必須原樣通過。
- 不做 UI/UX polish（詳情頁桌面兩欄、相關商品標題中文化等，另案處理）。
- 不主動重構本 sprint 範圍外的檔案。

> 註：`002` spec 驗收條件曾要求 `image_url` 必須是 HTTP(S) URL。本 sprint 針對 `image_url` 欄位 supersede 該規則（允許站內路徑），其餘 URL 欄位（`purchase_url`、`reference_url`、`source_url`）規則不變。

## User Story

作為網站訪客，我想看到穩定載入的商品圖片，以便瀏覽時不會遇到外部 CDN 失效造成的破圖。

作為 DW嚴選維護者，我想要圖片跟著商品資料一起放在 Git repo 內，以便商品的文字與圖片在同一個 PR 內審核、回溯與 rollback。

作為後續開發者（含 LLM agent），我想要職責清晰的小模組與單一 taxonomy 來源，以便修改時容易定位、不會漏改複本。

### 驗收條件

- [x] 新增 `scripts/localize-content-images.ts`：讀取 `content/products/*.json` 與 `content/guides/*.json`，下載外連 `image_url` 圖檔存入 `content/products/images/`、`content/guides/images/`，並把 JSON 的 `image_url` 改寫為站內路徑 `/images/products/<id>.<ext>`。
- [x] Script 可重複執行（idempotent）：`image_url` 已是 `/images/` 開頭者跳過；重跑不會產生重複檔案或改壞 JSON。
- [x] 下載失敗（HTTP 錯誤、timeout、非 image Content-Type）的項目保留原外連 URL 不改寫，並在 summary 中列出失敗清單與原因。
- [x] Schema：products / guides / links 的 `image_url` 接受「HTTP(S) URL」或「`/images/` 開頭的站內路徑」，拒絕相對路徑、含 `..` 的路徑、`javascript:`、`data:` 等其他值。
- [x] Nitro `publicAssets` 設定讓 `content/products/images/`、`content/guides/images/` 在 dev mode 與 `nuxt generate` 輸出中都以 `/images/products/`、`/images/guides/` 路徑可存取。
- [x] 實際執行 cutover：62 件商品圖完成本地化（失效來源除外），首頁、商品詳情、指南、搜尋結果實際渲染本地圖片。
- [x] `pnpm build:search-index` 重建後，`public/search-index.json` 內 document 的 `image_url` 為站內路徑。
- [x] `app/utils/search/search-index.ts` 移除 `DEFAULT_CATEGORIES`、`DEFAULT_CHANNELS`，`buildSearchIndexPayload` 的 categories / channels / tags 改為必填參數。
- [x] 新增 taxonomy 同步測試：`product-schema.ts` 的 `CATEGORY_IDS` / `CHANNEL_IDS`、`published-products` 的 `DEFAULT_TAXONOMIES` / `DEFAULT_LINKS` 與 `content/taxonomies/*.json`、`content/links/*.json` 內容一致，任何一邊改動不同步時測試失敗。
- [x] `app/utils/published-products.ts` 拆為 `app/utils/published-products/` 資料夾下的六個模組（types / shared / product-detail / compact-app / resource-rows / tags），不建 barrel file，所有 consumer 改為直接 import 個別模組。
- [x] 移除 production 未使用的 catalog dead code（`getCatalogView`、`getCatalogSearchProducts`、`getGroupedPublishedProducts` 及其私有 helpers 與 types），對應測試 describe 區塊一併移除。
- [x] `tests/published-products.test.ts` 依新模組拆為對應測試檔，既有測試案例（dead code 區塊除外）全數保留。
- [x] `app/pages/search.vue` 拆出 `useSearchPage` composable 與 search 子元件後，頁面檔案降到 200 行以下；現有 class 名與 DOM 結構不變，搜尋相關 E2E 原樣通過。
- [x] `scripts/migrate-google-sheet-products.ts`、`migrate-product-compact-schema.ts`、`migrate-content-domain-taxonomy.ts` 移至 `scripts/legacy/`，對應測試更新 import 路徑後全數保留通過。
- [x] `package.json` 補上 `engines.node >= 22` 與 `packageManager: pnpm@10.20.0`（與 Dockerfile 一致）。
- [x] 全部 quality gates 通過：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm generate`。

## 相關檔案

### 圖片本地化

- `scripts/localize-content-images.ts` —（新增）下載與改寫 script，CLI 慣例沿用 `build-search-index.ts`。
- `tests/localize-content-images.test.ts` —（新增）script 純函式測試（mock fetch，不打網路）。
- `app/utils/product-schema.ts` — `image_url` schema 擴充（products line 41、guides line 59、links line 76）。
- `tests/product-schema.test.ts` — 補站內路徑接受／拒絕案例。
- `nuxt.config.ts` — nitro `publicAssets` 設定。
- `content/products/images/`、`content/guides/images/` —（新增）圖檔目錄。
- `content/products/*.json`、`content/guides/*.json` — `image_url` 改寫為站內路徑。

### Code Quality

- `app/utils/published-products.ts` — 拆除（原 1036 行）。
- `app/utils/published-products/{types,shared,product-detail,compact-app,resource-rows,tags}.ts` —（新增）拆分後模組。
- `app/utils/search/search-index.ts` — 移除 DEFAULT_CATEGORIES / DEFAULT_CHANNELS（line 86–103）。
- `tests/taxonomy-sync.test.ts` —（新增）taxonomy 複本同步鎖定測試。
- `app/pages/search.vue` — 拆分（原 448 行）。
- `app/composables/use-search-page.ts` —（新增）搜尋頁狀態機 composable。
- `app/components/search/{search-input,search-idle-panel,search-suggestion-list,search-error-panel}.vue` —（新增）搜尋子元件。
- Consumer import 更新：`app/pages/{index,guide,links,search}.vue`、`app/pages/products/[id].vue`、`app/layouts/default.vue`、`app/components/{app-navigation,resource-list,product-card,product-detail}.vue`、`app/composables/use-catalog-data.ts`。
- `scripts/legacy/` —（新增）歸檔目錄。
- `package.json` — engines / packageManager。

## 介面 / 資料結構（API / Data Structure）

本 sprint 不新增 REST / SSE / WebSocket API。通訊協定維持 build-time filesystem JSON 與靜態資產。

### image_url 欄位值（改寫前後）

```json
// 改寫前（外連，仍為合法值，供未來新商品 draft 與下載失敗 fallback 使用）
{ "image_url": "https://img.pchome.com.tw/cs/items/ABC123/000001.jpg" }

// 改寫後（站內路徑）
{ "image_url": "/images/products/2026-06-02-blueair-3250空氣清淨機.jpg" }
```

Schema 規則（zod union）：

```text
image_url = HTTP(S) URL（沿用 http_url_schema）
          | 站內路徑：^/images/(products|guides)/ 開頭、不含 ".."、不含 query/hash
```

### localize script CLI

```bash
node scripts/localize-content-images.ts \
  [--products-dir content/products] \
  [--guides-dir content/guides] \
  [--timeout 15000] \
  [--dry-run]
```

Summary 輸出範例：

```text
localized: 60
skipped (already local): 2
failed: 2
  - content/guides/2026-06-08-日本米入門篇.json: https://scontent.ftpe8-2.fna.fbcdn.net/...jpg (HTTP 403)
  - content/products/2026-06-02-xxx.json: https://example.com/img (unsupported content-type: text/html)
```

檔名規則：`<內容檔 id>.<ext>`，`<ext>` 由 response `Content-Type` 對映（`image/jpeg→jpg`、`image/png→png`、`image/webp→webp`、`image/gif→gif`、`image/avif→avif`）；只有 `Content-Type` 是 `image/*` 但無法對映時，才退回 URL 副檔名；非 `image/*` Content-Type 或仍無法辨識者，該項標記 failed。`id` 即檔名，天然不 collision；重跑時同名覆蓋。

### nitro publicAssets

```ts
nitro: {
  publicAssets: [
    { dir: '../content/products/images', baseURL: '/images/products' },
    { dir: '../content/guides/images', baseURL: '/images/guides' },
  ],
}
```

> `dir` 的相對基準（rootDir vs srcDir）需在 Milestone 1 實作時以 dev mode 與 generate 輸出實際驗證，本範例僅示意。

### published-products 拆分模組表

| 新模組 | exports（public） | 內部 helpers（自原檔搬移） |
| --- | --- | --- |
| `published-products/types.ts` | 全部共用 type：`PublishedProductCard`、`ProductDetailView`、`TaxonomyDefinitions`、`CompactAppTabId`、`CompactAppState`、`CompactRouteQueryValue`、`CompactRouteState`、`CompactRouteStateOptions`、`CompactAppTab`、`CompactCategoryChip`、`CompactTagChip`、`CompactResourceRow`、`CompactLinkRow`、`CompactGuideRow`、`SearchResultSection`、`ResourceRowLinkAttributes`、`CompactAppView` | （純型別，無邏輯） |
| `published-products/shared.ts` | `getPublishedProducts`、`DEFAULT_TAXONOMIES`、`mapProductToCard`、`getCategoryDefinition`、`getChannelDefinition`、`getCategorySortOrder`、`compareText` | `compareProducts`、`compareProductsByLatest`、`compareProductsByName`、`compareNullableTimestampDesc`、`normalizeQuery` |
| `published-products/product-detail.ts` | `getProductDetail`、`getRelatedProductCards`、`getCatalogProductId` | `compareRelatedProducts`、`getRelatedProductScore` |
| `published-products/compact-app.ts` | `getCompactAppView`、`getCompactCategoryOptions`、`getCompactAppStateFromRoute`、`DEFAULT_LINKS` | `normalizeCompactTab`、`parseCategoryId`、`isProductCategoryId`、`getFirstQueryValue`、`getQueryValues`、`getNormalizedSelectedTags`、`getVisibleCategories`、`getEmptyReason`、`PRODUCT_CATEGORY_IDS` |
| `published-products/resource-rows.ts` | `getPublishedGuides`、`getPublishedLinks`、`getResourceRowLinkAttributes`、`getSearchResultSections` | `mapGuideToRow`、`mapLinkToRow`、`mapSearchSuggestionToRow`、`getSearchSuggestionMeta`、`getSearchSuggestionIcon`、`compareGuides`、`getSearchProducts`、`getSearchEmptyReason` |
| `published-products/tags.ts` | `getTagChips` | `getTopTags`、`getPublishedContentTagIds`、`getTagLabels`、`getTagLabel` |

刪除（dead code，production 無 consumer）：`getCatalogView`、`getCatalogSearchProducts`、`getGroupedPublishedProducts`、`getCatalogComparator`、`normalizeSort`、`matchesCategory`、`matchesQuery`、`matchesCardQuery`、`getCategoryOptions`、`groupCardsByCategory`、`ALL_CATEGORIES_VALUE`，以及 types `CatalogSort`、`CatalogState`、`CatalogCategoryOption`、`CatalogSortOption`、`CatalogView`、`GroupedPublishedProducts`；連同 `tests/published-products.test.ts` 的 `'catalog view state'` describe 區塊。

> 模組間依賴方向：`types.ts` ← 其他全部；`shared.ts` ← product-detail / compact-app / resource-rows / tags。禁止反向依賴與循環依賴。禁止建立 `published-products/index.ts` barrel——consumer 直接 import 個別模組。

### Consumer import 對照表

| Consumer | 改 import 自 |
| --- | --- |
| `app/pages/index.vue`、`guide.vue`、`links.vue` | `compact-app.ts`（`getCompactAppStateFromRoute`、`getCompactAppView`） |
| `app/pages/search.vue` | `compact-app.ts`、`resource-rows.ts`（`getSearchResultSections`）、`tags.ts`（`getTagChips`） |
| `app/pages/products/[id].vue` | `product-detail.ts` |
| `app/layouts/default.vue` | `compact-app.ts` |
| `app/components/app-navigation.vue` | `compact-app.ts`（`getCompactCategoryOptions`） |
| `app/components/resource-list.vue` | `resource-rows.ts`（`getResourceRowLinkAttributes`）、`types.ts` |
| `app/components/product-card.vue`、`product-detail.vue` | `types.ts`（type-only） |
| `app/composables/use-catalog-data.ts` | `types.ts`（`TaxonomyDefinitions`） |

### search.vue 拆分表

| 新檔 | 職責（自 search.vue 搬移的內容） |
| --- | --- |
| `app/composables/use-search-page.ts` | 狀態機與資料流：`pending_search_query`、`submitted_search_query`、`search_mode`、`suggestions`、`client_search_results`、loading / completed flags、`search_error`、兩個 request runners、三個 watchers（原 line 261–304）、`loadSubmittedSearch`、`retrySearch`、`clearSubmittedSearch`、`submitSearch` |
| `app/components/search/search-input.vue` | 搜尋輸入框 + IME composition 處理（`submitPendingSearchFromEvent` 的 isComposing / keyCode 229 guard、`getInputEventValue`、`syncPendingSearchInputValue`），emit `submit` / `update:query` |
| `app/components/search/search-idle-panel.vue` | 搜尋歷史面板 + 熱門 tag 面板（原 template line 64–114），emit `history-clicked` / `tag-clicked` / `clear-history` |
| `app/components/search/search-suggestion-list.vue` | 建議列表（原 template line 116–151），emit `suggestion-clicked` |
| `app/components/search/search-error-panel.vue` | 錯誤面板（原 template line 35–62），emit `retry` / `clear` |
| `app/pages/search.vue`（瘦身後） | route 解析、`useCatalogData` 接線、view mapping（`getSearchResultSections`、`getTagChips`、empty reason）、組裝子元件 |

> 約束：搬移時保留現有 CSS class 名與 DOM 層級，`tests/e2e/` 內所有 selector 不得修改；搜尋行為（debounce、history 寫入時機、IME guard）逐一保留。

## 邊界案例

- Case 1：圖片下載回應 HTTP 4xx/5xx 或 timeout。處理方式：該項標記 failed、保留原外連 `image_url`、summary 列出檔案與原因，script exit code 仍為 0（部分失敗不阻斷其餘項目）。
- Case 2：回應 `Content-Type` 不是 `image/*`（如被導到 HTML 錯誤頁）。處理方式：標記 failed，不寫入檔案。
- Case 3：URL 無副檔名且 `Content-Type` 無法對映。處理方式：標記 failed，要求人工處理。
- Case 4：CDN 阻擋非瀏覽器 User-Agent。處理方式：script 送瀏覽器型 UA header；仍失敗則按 Case 1 處理。
- Case 5：重跑 script 時 `image_url` 已是 `/images/` 開頭。處理方式：跳過（不重新下載、不改 JSON），summary 計入 skipped。
- Case 6：guides / links 的 `image_url` 為 `null`。處理方式：跳過。
- Case 7：`image_url` 含 `..`、相對路徑、`javascript:`、`data:`、或 `/images/` 之外的站內路徑。處理方式：schema validation 失敗，測試與 CI 不通過。
- Case 8：下載的圖檔異常大（> 2 MB）。處理方式：照常寫入但 summary 顯示 size warning，由人工決定是否處理；不自動壓縮。
- Case 9：未來新商品 draft 帶外連 `image_url`。處理方式：schema 允許（union），重跑 localize script 即可本地化；此為支援的常態流程而非例外。
- Case 10：`content/taxonomies/*.json` 新增分類但 `CATEGORY_IDS` 未同步。處理方式：taxonomy 同步測試失敗，明確指出哪個複本不同步。
- Case 11：search.vue 拆分後 IME 輸入中按 Enter。處理方式：行為不變——composition 進行中不觸發搜尋（既有 E2E 驗證）。

## ADR（Architecture Decision Record）

- 決策：圖片存 `content/products/images/`、`content/guides/images/`，以 Nitro `publicAssets` 對映到 `/images/*` serve。
- 原因：使用者指定圖片跟著內容資料走，同一個 PR 內可同時 review 商品 JSON 與圖片；`publicAssets` 是 Nitro 原生機制，dev 與 generate 都支援，不需自寫 copy script。
- 替代方案：存 `public/images/`——Nuxt 原生路徑、零設定，但圖片與內容資料分離，PR review 與 rollback 要跨兩個目錄。已由使用者裁決排除。

- 決策：擴充既有 `image_url` 欄位為 union（HTTP(S) URL｜站內路徑），不新增 `image_path` 欄位。
- 原因：避免雙欄位並存的狀態歧義（兩者都有值時誰優先）；渲染端、search index 完全不用改。
- 替代方案：新增 `image_path` 欄位保留 `image_url` 不動——向後相容較好，但所有讀取端都要加優先序判斷，複雜度更高。

- 決策：圖檔直接 commit 進 git，不用 Git LFS。
- 原因：現況約 64 張商品圖，量級小；LFS 增加 clone / CI 設定成本，不符 YAGNI。
- 替代方案：Git LFS——圖量成長到顯著影響 repo 大小時再遷移。

- 決策：下載失敗的項目保留原外連 URL，不設為 `null`、不阻斷 script。
- 原因：保留現狀是最小破壞；失效圖在前台本來就有 fallback icon，人工可依 summary 逐筆決定補圖或移除。
- 替代方案：失敗即設 `null`——會把「來源暫時不穩」與「圖真的沒了」混為一談。

- 決策：`published-products.ts` 拆成資料夾內六個模組、直接 import，不建 barrel。
- 原因：專案 coding style 明文禁止 barrel file；資料夾分組讓 file system 充當導航索引。
- 替代方案：保留原檔做 re-export barrel——零 import 改動但違反專案規範，且 1036 行檔案的問題只是被藏起來。

- 決策：taxonomy 單一來源定為 `content/taxonomies/*.json`；`CATEGORY_IDS` / `CHANNEL_IDS`（zod enum 需要 compile-time literal）與 `DEFAULT_TAXONOMIES` / `DEFAULT_LINKS`（client runtime 無 fs 存取的 fallback）保留為「受測試鎖定的複本」，build-time 的 `DEFAULT_CATEGORIES` / `DEFAULT_CHANNELS` 直接刪除。
- 原因：zod enum 的 literal type 無法由 runtime 讀檔產生；client fallback 移除會改變 taxonomy 載入失敗時的行為（超出本 sprint 不改行為的原則）。同步測試讓複本失去「默默漂移」的能力。
- 替代方案：codegen 從 JSON 產生 TS 常數——徹底但引入 codegen 工具鏈，對 7+6 個 id 的清單過重。

- 決策：刪除 catalog dead code（`getCatalogView` 一族）與其測試區塊。
- 原因：production 無任何 consumer，是 006 compact redesign 之前的舊 catalog view 殘留；保留只會誤導後續開發者與 agent。
- 替代方案：保留「以後可能用」——違反 YAGNI；git history 永遠找得回來。

## Milestones

執行順序：M1 → M2 → M3 → M4 → M5 → M6。M3 與 M1/M2 無檔案重疊，必要時可平行；M4 依賴 M3（DEFAULT 常數的處置），M5 依賴 M4（import 路徑）。

### Milestone 1：localize script 與 image_url schema（TDD）

> 範圍：`scripts/localize-content-images.ts`（新增）、`tests/localize-content-images.test.ts`（新增）、`app/utils/product-schema.ts`、`tests/product-schema.test.ts`、`nuxt.config.ts`
> 驗證：`pnpm test tests/localize-content-images.test.ts tests/product-schema.test.ts`、dev mode 手動丟一張測試圖確認 `/images/products/test.jpg` 可存取、`pnpm generate` 後確認輸出含該路徑
> 預期結果：script 與 schema 就緒，但尚未執行 cutover；既有 content 不變

- [x] 撰寫/更新測試（Red）：
  - script 純函式測試（注入 mock fetch）：Content-Type → 副檔名對映、檔名產生（`<id>.<ext>`）、`image_url` 改寫、idempotent 跳過（`/images/` 開頭）、HTTP 錯誤 / 非 image Content-Type / 無法辨識副檔名 → failed、`null` image_url 跳過、`--dry-run` 不寫檔、summary 結構（localized / skipped / failed 含原因）。
  - schema 測試：`/images/products/x.jpg` 接受、`/images/guides/x.png` 接受、`images/x.jpg`（無前導斜線）拒絕、`/images/../secret` 拒絕、`/other/x.jpg` 拒絕、`javascript:` / `data:` 拒絕、HTTP(S) URL 維持接受；guides / links 的 nullable 行為不變。
- [x] 實作最小功能（Green）：script 主體（沿用 `build-search-index.ts` 的 CLI 參數與檔案 I/O pattern、瀏覽器型 UA、timeout）、`http_url_schema` 旁新增 local image path schema 並 union 進三個 collection 的 `image_url`、nuxt.config 加 `publicAssets`。
- [x] Refactor 並確認測試維持通過：整理 summary 輸出可讀性，確認 `pnpm lint`、`pnpm typecheck` 通過。

### Milestone 2：圖片 cutover 與 Frontend Handoff

> 範圍：`content/products/*.json`、`content/guides/*.json`、`content/products/images/`、`content/guides/images/`、`public/search-index.json`
> 驗證：執行 script → `pnpm test` → `pnpm generate` → `./dev.sh restart` 後實際開頁面（首頁、商品詳情、指南、搜尋）
> 預期結果：62 件商品圖（失效來源除外）與 guide 圖改為本地 serve，頁面渲染正常

- [x] 撰寫/更新測試（Red）：不適用新測試；以既有 schema 測試、`published-products` 測試與 E2E 作為回歸網。
- [x] 實作最小功能（Green）：執行 `node scripts/localize-content-images.ts`，檢視 summary；失敗清單（預期至少含 fbcdn 失效圖）記入 works.md 待人工決定；執行 `pnpm build:search-index` 更新 search index。
- [x] Refactor 並確認測試維持通過：跑全部 gates（lint / typecheck / test / test:e2e / generate），用 agent-browser 實際確認四個頁面圖片來自 `/images/*` 且無破圖（失效來源除外）。

### Milestone 3：taxonomy 單一來源

> 範圍：`app/utils/search/search-index.ts`、`scripts/build-search-index.ts`、`tests/search-index.test.ts`、`tests/taxonomy-sync.test.ts`（新增）
> 驗證：`pnpm test tests/search-index.test.ts tests/taxonomy-sync.test.ts`、`pnpm build:search-index`
> 預期結果：build-time taxonomy 只來自 `content/taxonomies/`；殘留複本被同步測試鎖定

- [x] 撰寫/更新測試（Red）：
  - `tests/taxonomy-sync.test.ts`：讀 `content/taxonomies/categories.json` / `channels.json` / `tags.json` 與 `content/links/*.json`，斷言 `CATEGORY_IDS`、`CHANNEL_IDS`（product-schema.ts）id 集合一致；`DEFAULT_TAXONOMIES`、`DEFAULT_LINKS`（published-products）內容一致。
  - 更新 `tests/search-index.test.ts`：`buildSearchIndexPayload` 未傳 categories / channels / tags 時型別不允許（測試改為一律明確傳入）。
- [x] 實作最小功能（Green）：刪除 `search-index.ts` line 86–103 的 `DEFAULT_CATEGORIES` / `DEFAULT_CHANNELS`，options 的 categories / channels / tags 改必填；確認 `scripts/build-search-index.ts` 呼叫端已傳入（現況已傳，僅確認）。
- [x] Refactor 並確認測試維持通過：確認無其他呼叫端依賴預設值（`rg buildSearchIndexPayload`）。

### Milestone 4：拆分 published-products.ts

> 範圍：`app/utils/published-products/`（新增六檔）、刪除 `app/utils/published-products.ts`、Consumer import 對照表所列 11 個檔案、`tests/published-products*.test.ts` 拆分
> 驗證：`pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm test:e2e`
> 預期結果：模組拆分完成、dead code 移除，行為與 UI 完全不變

- [x] 撰寫/更新測試（Red）：把 `tests/published-products.test.ts` 依拆分模組表拆為 `tests/published-products/{shared,product-detail,compact-app,resource-rows,tags}.test.ts`（describe 對映：`'published products mapping'` → shared + product-detail、`'published guide and link mapping'` → resource-rows、`'compact app view state'` → compact-app + tags、`'route-driven compact app state'` → compact-app、`'post-migration product content'`（測的是 `validateContentTaxonomyReferences`，與 published-products 無關）→ 獨立成 `tests/content-taxonomy-references.test.ts`）；先讓新測試檔 import 新模組路徑（此時 Red）。刪除 `'catalog view state'` 區塊。
- [x] 實作最小功能（Green）：按拆分模組表搬移程式碼（搬移不改寫——函式內容逐字保留，只動 import/export）；刪除 dead code 清單；按 Consumer import 對照表更新 11 個檔案。
- [x] Refactor 並確認測試維持通過：檢查模組依賴方向（types ← shared ← 其餘）無循環，跑全部 gates 與 E2E。

### Milestone 5：拆分 search.vue

> 範圍：`app/pages/search.vue`、`app/composables/use-search-page.ts`（新增）、`app/components/search/`（新增四檔）
> 驗證：`pnpm test`、`pnpm test:e2e`（搜尋相關 specs 必須原樣通過）、實際開搜尋頁操作（輸入、建議、送出、歷史、清除、IME）
> 預期結果：search.vue < 200 行，行為與 DOM 結構不變

- [x] 撰寫/更新測試（Red）：為 `useSearchPage` 補單元測試（狀態機轉換：idle → suggesting → searching、error → retry、clear；history 寫入時機），mock `client-search` 模組；現有 E2E 不改動。
- [x] 實作最小功能（Green）：按 search.vue 拆分表搬移；template 搬到子元件時保留 class 名與 DOM 層級；props / emits 介面如表列。
- [x] Refactor 並確認測試維持通過：確認 search.vue 行數 < 200、E2E 全綠、agent-browser 實際操作搜尋流程（含 IME 輸入確認不提前觸發）。

### Milestone 6：legacy 歸檔、engines 與總驗收

> 範圍：`scripts/legacy/`、三個 migration scripts 與其測試、`package.json`、`README.md`（如有路徑引用）
> 驗證：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm generate`、`./dev.sh restart` 後實際開頁面
> 預期結果：sprint 全部完成，可交付 review

- [x] 撰寫/更新測試（Red）：更新 `tests/migrate-google-sheet-products.test.ts`、`tests/migrate-product-compact-schema.test.ts` 的 import 路徑指向 `scripts/legacy/`（測試案例不增不減）。
- [x] 實作最小功能（Green）：`git mv` 三個 migration scripts 至 `scripts/legacy/`；`package.json` 補 `engines` 與 `packageManager`；README 如有引用舊路徑一併更新。
- [x] Refactor 並確認測試維持通過：總驗收——全部 gates + Frontend Handoff（首頁、詳情、指南、連結、搜尋實際看過），更新 works.md。
