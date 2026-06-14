# 008.6 Compact UX Bugfixes Works

## Milestone 1：首頁分類與商品詳情基本修正

### TDD 紀錄

- Red：新增／更新 `tests/published-products.test.ts`，覆蓋 0 count category hidden、首頁與 desktop sidebar 共用 category option helper、推薦商品排序與排除目前商品；更新 compact E2E 覆蓋 sidebar／首頁隱藏空分類與詳情推薦區。
- Red result：相關 view model 測試先出現預期失敗，確認既有首頁分類與 sidebar 分別計算、且 detail view 尚無 related products。
- Green：新增 `getCompactCategoryOptions()` 作為首頁 pills 與 desktop sidebar 共用來源；新增 `getRelatedProductCards()` deterministic scoring；商品詳情頁傳入全量商品並 render 小型推薦 row；detail hero image 改為 1:1 contain。

### 驗證結果

- `pnpm test tests/published-products.test.ts`：35 passed。
- `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`：8 passed。

## Milestone 2：Guide／Links 共用列表 UI

### TDD 紀錄

- Red：新增 Link optional `image_url` schema 測試、guide/link resource row mapping 測試、internal/external row attributes 測試，並更新 E2E 檢查 Guide／Links row layout 一致性。
- Green：新增 `CompactResourceRow` contract 與 `ResourceList` component；`guide.vue` 與 `LinkPanel` 改用共用 row；Link schema 新增 optional `image_url`，沒有圖片時維持 icon fallback。

### 技術決策

- `ResourceList` 依 `external` 決定使用 `<a>` 或 `NuxtLink`，外部連結安全屬性集中由 row helper 產生。
- 共用 row media 使用 1:1 contain；圖片載入失敗時以 fallback icon 維持版面。

### 驗證結果

- `pnpm test tests/product-schema.test.ts tests/published-products.test.ts`：57 passed。
- `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`：9 passed。

## Milestone 3：搜尋狀態機、autocomplete 與搜尋紀錄

### TDD 紀錄

- Red：新增 `getSearchPageMode()`、search history serialize／dedupe／limit、localStorage fallback、autocomplete request race、熱門 tag 跨 products／guides／links 統計等測試；E2E 覆蓋 typing 不改 URL、Enter／熱門 tag／history 才提交搜尋。
- Green：移除 typing debounce 改 URL 行為；新增 idle／suggesting／searching 狀態機、autocomplete simple list、search history UI 與清除操作、search index error panel。
- Fixbug：Playwright 在 hydration 前 `fill()` 可能讓 DOM input 與 Vue state 分離；搜尋框改為原生受控 input，hydration 前 disabled，mounted 後同步 DOM value，讓 E2E 與實際互動一致。

### 技術決策

- 搜尋紀錄只使用 `dwselect.search.history.v1`，完全相同字串去重、最新在前、最多 12 筆；localStorage 不可用或 JSON 損壞時回空陣列，不阻斷搜尋。
- 熱門 tag 從 published products／guides／links 的 `tag_ids` 統計後轉為 taxonomy label，排序為 count desc、label asc，最多 10 筆。

### 驗證結果

- `pnpm test tests/client-search.test.ts tests/published-products.test.ts`：45 passed。
- `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`：11 passed。

## Milestone 4：混合搜尋結果三區與整體驗證

### TDD 紀錄

- Red：新增 `getSearchResultSections` contract 測試，覆蓋商品／指南／連結固定順序、row mapping、空 section 跳過；新增 Link optional `image_url` search index mapping 測試；更新 E2E 期待搜尋結果以 section + shared resource row 呈現。
- Red result：`pnpm test tests/client-search.test.ts tests/published-products.test.ts tests/search-index.test.ts` 先因 `getSearchResultSections is not a function` 失敗，確認測試能捕捉缺口。
- Green：新增 mixed search section mapper，將 `SearchSuggestion[]` 轉為 `SearchResultSection[]` 與 `CompactResourceRow[]`；`search.vue` 改以商品、指南、連結三區 render `ResourceList`；搜尋結果 row media 沿用 1:1 contain 的 shared resource row。
- Refactor / compatibility：更新 Nuxt smoke source contract，反映搜尋輸入分離狀態機與 Guide／Links／Search 共用 `ResourceList` 後，安全外部連結屬性集中於 view model / row helper。

### 技術決策

- 搜尋三區順序由 `getSearchResultSections()` 固定為 products → guides → links，並在 helper 端直接過濾 empty section，讓 Vue template 不需要重複判斷 count。
- 商品搜尋 row 使用 `channel_label` 與 `price_text` 組成 meta；指南／連結 row 使用 category labels 作 meta。圖片欄位直接保留 search index 的 `image_url`，沒有圖片時交由 `ResourceList` fallback icon。
- `public/search-index.json` 只透過 `pnpm generate` 的 `pnpm build:search-index` 自然更新，未手改。

### 驗證結果

- `pnpm test tests/client-search.test.ts tests/published-products.test.ts tests/search-index.test.ts`：3 files / 60 tests passed。
- `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts`：12 passed。
- `pnpm test`：17 files / 162 tests passed。
- `pnpm lint`：passed。
- `pnpm typecheck`：passed。
- `pnpm generate`：passed，產出 `.output/public`。
- `node scripts/assert-runtime-google-sheet-clean.ts`：passed。

## XReview 修正：IME、storage、圖片 fallback 與驗證補齊

### TDD 紀錄

- Red：xreview 指出 Enter submit 未處理 IME composition、search history storage getter 丟錯缺覆蓋、detail／related 圖片載入失敗 fallback 缺口、search index error retry path 缺 E2E、phone／tablet 驗證紀錄不足。
- Green：搜尋 input 改用 `v-model`，保留 hydration 前 disabled gate，Enter handler 在 composition 中不 submit，非 composition 時才 `preventDefault()`；搜尋紀錄改用 VueUse `useStorage` 搭配安全 storage accessor 與自訂 serializer，並將上限調整為 12 筆。
- Green：detail hero 與 related product 圖片載入失敗時顯示 fallback icon 並保留 1:1 容器；search index suggestion retry 會清 error 並顯示 loading；Nuxt color mode 改用 cookie storage，避免 color mode bootstrap 直接讀 localStorage。
- Test：補 IME Enter 不提交、不寫 history、corrupted search history storage 不阻斷搜尋、detail／related image error fallback、search index error retry path 的 E2E；補 localStorage getter 丟錯時 `getSafeBrowserLocalStorage()` 回 `null` 的 Vitest。

### 技術決策

- 直接採用 `@vueuse/core` 的 `useStorage` 管理 search history persistence，但保留 domain helper 處理 trim、非字串過濾、完全相同字串去重、12 筆上限與壞 JSON 降級。
- Direct `window.localStorage` getter throws 在 Nuxt dev server 會先被 Vue devtools integration 影響 hydration，因此 property getter 本身用 Vitest 驗證；E2E 覆蓋使用者可觀察的 corrupted JSON storage flow。
- `@keydown.enter` 不使用 `.prevent` modifier，避免 IME composition Enter 被預先 `preventDefault()`；handler 內確認非 composition 後才阻止預設行為並提交搜尋。

### 驗證結果

- `pnpm test tests/client-search.test.ts`：9 passed。
- `pnpm exec playwright test --project=desktop tests/e2e/compact-app.spec.ts -g "keeps search usable"`：1 passed。
- `pnpm test`：17 files / 164 tests passed。
- `pnpm test:e2e tests/e2e/compact-app.spec.ts`：以 `https://dwselect.toybox.local` 為 `baseURL`，phone／tablet／desktop 共 42 passed、6 skipped；實際透過 Traefik 入口載入首頁、商品詳情、指南、連結、搜尋頁與主要互動路徑。
- `pnpm lint`：passed。
- `pnpm typecheck`：passed。
- `pnpm generate`：passed，產出 `.output/public`。
- `node scripts/assert-runtime-google-sheet-clean.ts`：passed。
