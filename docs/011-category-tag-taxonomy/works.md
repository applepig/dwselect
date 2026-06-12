# Sprint 011 工作紀錄

## 2026-06-12：計畫 xreview（動工前）

### Review 範圍

- `docs/011-category-tag-taxonomy/` 的 plan.md、spec.md、works.md（實作前計畫審查，Docs Lens）。
- spec 引用的程式現況以 Sprint 010 未 commit 工作樹查證。

### Reviewer 狀態

- `claude:fable`：完成，1 Critical、3 Important、4 Minor。
- `codex:gpt-5.5`：完成，3 Important、1 Minor。
- `gemini:pro`：完成，1 Important、1 Minor。

### 已確認 Findings 與決策

- Issue #1（Critical，fable）：M1 要求 schema 拒絕舊購買欄位、同時要求全測試綠且 content 不動，互斥（`product-schema.test.ts:392` 對真實 content parse 必失敗）。決策：product 欄位 schema 切換移到 M2，與遷移原子完成；M1 只做 taxonomy 解耦。
- Issue #2（Important，三方共識）：brands runtime 讀取鏈（`content.config.ts`、`use-catalog-data.ts`、`TaxonomyDefinitions`、`build-search-index.ts`）不在 spec 範圍。決策：補進相關檔案、驗收條件與 M1/M2 範圍；M1 先建空 brands.json 與 collection。
- Issue #3（Important，codex）：62 筆商品 id rename 後站外舊 URL 全數 404，無相容策略。決策：明文接受 breaking change，寫入非目標、邊界案例與 ADR-8，不做 redirect stub。
- Issue #4（Important，fable）：spec 把 referential 驗證歸在 `content-taxonomy-references.test.ts`，但真正防線在 `product-schema.test.ts:405-411`，有誤刪風險。決策：更正測試歸屬描述，要求保留並擴充 brands 規則。
- Issue #5（Important，fable）：e2e hardcode 舊 taxonomy（`/?category=av`、「影音」、「其他」隱藏斷言），遷移後必紅且無 milestone 涵蓋。決策：補列 `tests/e2e/compact-app.spec.ts` 歸入 M2，並在邊界案例定案「其他」導覽行為。
- Issue #6（codex Important／fable Minor）：「新增分類但無商品照常顯示」與現行 `count > 0` 過濾及既有 E2E 衝突。決策：改寫邊界案例為維持隱藏，解耦演練只驗資料層。
- Minors（一併修）：「七點決策」更正為六點並指向 works.md；遷移 idempotency 改用 `offers` 欄位特徵判定；product id 日期前綴來源定義（遷移沿用、新商品用建立日）；search index `SearchDocument` 明確改讀 `offers[0]`。

### False Positive

- 無。三方 findings 經 coordinator 讀實際程式碼驗證全數屬實。

### 完成修正

- 本次只修改 `spec.md`（前置條件、非目標、驗收條件、相關檔案、介面、邊界案例、ADR-8、Milestones 重切），未修改 production code。

## 2026-06-12：xreview 規格補強

### Review 範圍

- 目前工作樹的 staged、unstaged、untracked 變更。
- Sprint 010 實作與 Sprint 011 規格文件。

### Reviewer 狀態

- `codex:gpt-5.5`：完成，未提出 Critical／Important finding。
- `gemini:pro`：完成，提出 route fallback 風險；驗證後判定目前 `app/pages/index.vue` 已傳入 `category_ids`，不列為阻擋 issue。
- `ddd-reviewer`：完成，提出兩個 Sprint 011 spec Important findings。
- `claude:fable`：失敗，原因為 session limit。

### 已確認 Findings

- Issue #1：Sprint 011 要求 content-only taxonomy 擴充，但 `tests/product-schema.test.ts` 仍有 hardcoded taxonomy id / label snapshot；若 spec 未要求改寫，後續新增 taxonomy JSON 仍會被測試耦合擋住。
- Issue #2：Sprint 011 要求 tag aliases 提升搜尋命中，但 spec 未明確要求 `app/utils/search/search-index.ts` 將 aliases 納入 searchable fields，可能導致 aliases 只存在於資料、無法命中搜尋。

### 完成修正

- `spec.md` 資料驅動化驗收條件補上：`tests/product-schema.test.ts` 的 hardcoded taxonomy snapshot 必須改寫為 shape、唯一 id、排序規則驗證。
- `spec.md` taxonomy 遷移驗收條件補上：`app/utils/search/search-index.ts` 必須將 tag `aliases` 當作搜尋同義詞納入 index。
- `spec.md` 介面段明確定義：沿用現有 `aliases` 欄位作為 synonyms 語意，不另增 `synonyms` 欄位，且 aliases 不需要出現在 `SearchIndexDocumentSummary` 或前台顯示資料中。

### 驗證

- 本次只修改 Sprint 011 文件，未修改 production code。
- 已讀回 `spec.md` 相關段落確認內容符合 xreview 決策。

## 2026-06-12：brand taxonomy 規格補充

### 決策

- 新增 `content/taxonomies/brands.json`，品牌作為與一般 tags 平行的 taxonomy 檔案管理。
- 不新增 `brand_id` 或 `brand_ids` 欄位；products 繼續用既有 `tag_ids` 引用 brand ids。
- brands 只套用 products；guides / links 的 `tag_ids` 只能引用一般 `tags.json`。

### Spec 更新

- `spec.md` 目標、非目標、驗收條件、相關檔案、資料結構、邊界案例、ADR 與 milestones 已納入 `brands.json`。
- 規格明確要求 product tag label resolution 與 search index 對 products 使用 tags + brands 聯集，guides / links 只使用 tags。
- 規格新增 tags / brands id collision 測試要求，避免同一 id 同時存在兩個 taxonomy 檔案造成解析歧義。

## 2026-06-12：product 欄位重整併入 011

### 決策

- 新增 `english_name: string` 作為 authoring 必填欄位，並用它產生 product id、JSON 檔名 stem 與 `/products/:id` URL；`id` 仍必須等於檔名 stem。
- 將 `search_aliases: string[]` 與 `model_numbers: string[]` 加入 products，兩者不顯示但進 search index。
- 將頂層 `channel_id`、`purchase_url`、`price`、`price_text` 改為 `offers[]`，每列綁定 `channel_id`、`url`、`price`、`price_text`、`checked_at`。
- 現有 UI 不新增多通路列表；`offers[0]` 是 primary offer，用於既有價格、通路與購買 CTA。
- 描述拆成 `summary`、`long_description`、`llm_description` 三欄；`summary` 與 `long_description` 原則上由使用者撰寫，`llm_description` 由 LLM 維護，可包含規格與補充筆記。

### Spec 更新

- `spec.md` 新增 Product 欄位重整驗收條件與 product JSON 範例。
- `spec.md` 新增 english name、offers、描述欄位、search aliases / model numbers 的 schema、migration、search index 與測試要求。
- `spec.md` 新增 product id / filename rename 的 `renamed_ids` summary，要求同步更新 `related_product_ids`、local image path、search index 與 prerender routes。
- `spec.md` 新增 ADR-6（多通路購買資訊改為 `offers[]`）、ADR-7（描述拆成 user-written 與 LLM-maintained 欄位）、ADR-8（以 `english_name` 產生 product id、檔名與 URL）。

## 2026-06-12：Milestone 1 taxonomy 資料驅動化

### Red

- 更新 `tests/product-schema.test.ts`：category / channel 改測 kebab-case ASCII 格式、taxonomy content 改為 shape／唯一 id／排序規則驗證，並加入 brands referential 規則。
- 更新 `tests/content-taxonomy-references.test.ts`：真實 content referential 驗證納入 brands，products 的 `tag_ids` 可引用 tags 或 brands，guides / links 仍只能引用 tags。
- 更新 `tests/published-products/*.test.ts`：所有 public function 明確傳入 taxonomies / links，新增 fixture category / brand 解耦演練，並測 product tag label resolution 使用 tags＋brands、guides / links 不套用 brands。
- 移除 `tests/taxonomy-sync.test.ts`，因 `CATEGORY_IDS`、`CHANNEL_IDS`、`DEFAULT_TAXONOMIES`、`DEFAULT_LINKS` 複本被移除後已無同步鎖定目的。
- Red 驗證：受影響 Vitest 檔案如預期失敗，包含 enum 仍阻擋新 category / channel、缺 `brands.json`、product brand label 未解析、route parsing 仍被 hardcoded category Set 擋住。

### Green

- `app/utils/product-schema.ts` 移除 `CATEGORY_IDS` / `CHANNEL_IDS`，category / channel / tag id 統一用 kebab-case ASCII schema；新增 `brand_taxonomy_schema`，referential 驗證允許 products 使用 tags＋brands、guides / links 只使用 tags。
- `app/utils/published-products/*` 移除 `DEFAULT_TAXONOMIES`、`DEFAULT_LINKS`、`PRODUCT_CATEGORY_IDS`；`taxonomies` / `links` 由呼叫端必填，route category 只依 caller 傳入的 `category_ids` 判斷。
- `TaxonomyDefinitions` 新增必填 `brands`；product card/detail/tag chips 對 products 使用 tags＋brands label resolution，guides / links 維持 tags-only。
- `content.config.ts` 新增 brands collection，`content/taxonomies/brands.json` 建立為 `{ "items": [] }`；`use-catalog-data.ts` query brands 並納入 `runtime_taxonomies`。
- 呼叫端頁面與 navigation 改為 runtime data 存在時才呼叫 public functions，不再傳入 production fallback taxonomy / links 複本。

### Refactor／設計取捨

- M1 僅解除 taxonomy hardcode 與補 brands runtime chain，未遷移 product JSON、未切換 `english_name` / `offers` schema、未更新 `public/search-index.json`，符合 M2 邊界。
- `brands.json` 目前保持空陣列，既有 content 行為不變；新增 category 無商品仍不出現在 visible category chips，與既有 UX 相容。
- runtime 呼叫端使用明確 guard，而不是新增另一份 fallback taxonomy，避免把 SSOT 從 `content/taxonomies/*.json` 重新複製回 production code。

### 驗證

- `pnpm test`：通過（25 files / 184 tests）。
- `pnpm typecheck`：通過。
- `pnpm lint`：通過。

## 2026-06-13：Milestone 2 product schema 切換、新 taxonomy 定義與內容遷移

### Red

- 更新 product schema 與 fixture 測試，先鎖定 `english_name`、`offers[]`、`long_description`、`llm_description`、`search_aliases`、`model_numbers`，並拒絕舊頂層 `channel_id` / `purchase_url` / `price` / `price_text` / `description`。
- 更新 search index、published product、Nuxt smoke、content taxonomy reference 與 E2E 測試，要求新 category ids、brands taxonomy、primary offer mapping、英文 id / route、舊 category fallback 與 search alias / model number / LLM description 命中。
- 新增 `scripts/migrate-category-tag-taxonomy.ts` 的遷移與 idempotency 測試路徑，要求 mapping 遺漏 fail-fast、dry-run 不寫檔、已遷移內容可重複執行。

### Green

- `app/utils/product-schema.ts` 切換為新 product shape：必填 `english_name`、`offers[]`、`long_description`、`llm_description`、`search_aliases`、`model_numbers`；移除舊購買與 description 欄位。
- `content/taxonomies/categories.json` 更新為七個新分類；`tags.json` 改為一般 tag taxonomy；`brands.json` 填入從 62 筆商品抽出的 brand taxonomy。
- 62 筆 published products 已遷移到 ASCII `id` / JSON 檔名 / local image path，並改用新 `category_id`、tags＋brands `tag_ids` 與 `offers[0]` primary offer；2 筆 guides 與 3 筆 links 同步更新 taxonomy references。
- `app/utils/published-products/*` 與 `app/utils/search/search-index.ts` 改讀 primary offer、`long_description`、brands label / aliases，並讓 search index 納入 `english_name`、`search_aliases`、`model_numbers`、`llm_description`。
- legacy Google Sheet / compact schema migration helper 已同步輸出新 product shape，避免 deprecated script 測試仍鎖住舊欄位。
- `tests/e2e/compact-app.spec.ts` 更新 hardcoded route / category label，包含 `/products/2026-06-02-sharp-65-inch-xled` 與 `av-theater` / `影音劇院`。

### Refactor／設計取捨

- 多通路資料只建立資料模型；UI 維持既有單一 CTA，全部 card / detail 顯示使用 `offers[0]`，避免 M2 同時改前台資訊架構。
- Product id rename 明確接受舊 `/products/<old-id>` 404，不加 redirect stub；E2E 與 generate 已改走新 ASCII route。
- 遷移 script 保留在 `scripts/migrate-category-tag-taxonomy.ts`，本 milestone 不移入 `scripts/legacy/`，方便 M2 review mapping 與重跑 idempotency。
- E2E 初次失敗的 product detail 500 不是 production code 問題，而是 Docker dev container 的 Nuxt Content / module cache 尚未重新解析大規模 rename；重啟 `dwselect-app` 與 Traefik 後，product detail route 恢復 200，完整 E2E 通過。

### 遷移摘要

- 最終 idempotency 檢查：`node scripts/migrate-category-tag-taxonomy.ts --dry-run` 輸出 `migrated: 0`、`skipped: 62`、`unmapped: []`、`renamed_ids: []`。
- 正式重跑：`node scripts/migrate-category-tag-taxonomy.ts` 輸出同上，確認目前工作樹內容已全數遷移且 script 可重複執行。
- `pnpm build:search-index` 重建 `public/search-index.json`：67 documents。

### 驗證

- `node scripts/migrate-category-tag-taxonomy.ts --dry-run`：通過。
- `node scripts/migrate-category-tag-taxonomy.ts`：通過，idempotent no-op。
- `pnpm build:search-index`：通過（67 documents）。
- `pnpm test`：通過（25 files / 187 tests）。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm test:e2e --project=phone tests/e2e/compact-app.spec.ts`：通過（15 passed / 3 skipped）。
- `pnpm test:e2e`：通過（48 passed / 6 skipped）。
- `pnpm generate`：通過（prerendered 141 routes；保留既有 sourcemap / Rollup PURE comment warnings）。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。

## 2026-06-13：Milestone 3 回歸驗證與 Frontend Handoff

### Frontend Handoff

- 首頁分類導覽：實際打開 `https://dwselect.toybox.local/`，確認新 taxonomy 顯示「電腦3C、網路通訊、影音劇院、小家電、大家電、生活百貨」，「其他」因無商品維持隱藏；點「影音劇院」後 URL 成為 `/?category=av-theater`，商品數 10。
- Tag explorer 篩選：實際打開 `/search`，確認熱門 tag / brand 清單來自新 taxonomy；點「廚房」後搜尋欄為「廚房」，商品結果 15 筆。
- 商品詳情：實際打開 `/products/2026-06-02-sharp-65-inch-xled`，確認頁面 200、title 正常、tag 顯示「顯示器」與 brand「Sharp」、CTA 為「到 PChome 購買」、相關商品顯示。
- 商品詳情 tag 連結：點「顯示器」導到 `/search?q=顯示器` 且商品結果 7 筆；點 brand「Sharp」導到 `/search?q=Sharp` 且商品結果 2 筆。

### Red / Green

- 實看時 agent-browser 長時間 dev session 的 console 留有舊 HMR / hydration mismatch 訊息；用 fresh Playwright page 補 regression test `hydrates direct search query routes without mismatch warnings`，確認直開 `/search?q=Sharp` 不會輸出 hydration mismatch。
- 新增 regression test 後，完整 E2E 三個 viewport 通過，判定該 console 訊息是舊 dev session noise，不是目前可重現 production bug。

### Refactor／收尾

- `scripts/migrate-category-tag-taxonomy.ts` 移入 `scripts/legacy/migrate-category-tag-taxonomy.ts`，完成一次性遷移 script 歸檔。
- `spec.md` M3 checkbox 已勾選，並更新遷移 script 的最終 legacy 路徑。

### 驗證

- `pnpm test`：通過（25 files / 187 tests）。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm test:e2e --project=phone tests/e2e/compact-app.spec.ts --grep "hydrates direct search query routes"`：通過。
- `pnpm test:e2e`：通過（51 passed / 6 skipped）。
- `pnpm generate`：通過（67 search documents；prerendered 141 routes；保留既有 sourcemap / Rollup PURE comment warnings）。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。

## 2026-06-13：搜尋 idle 熱門標籤／品牌分組 follow-up

### 需求

- 搜尋 idle 頁原本把一般 tags 與 brands 混在同一個「熱門 tag」區塊，調整為「熱門標籤」與「熱門品牌」兩個區塊。
- 兩個區塊各自只顯示 `count > 3` 的項目，且各自最多 10 個。

### 實作

- 新增 `getPopularSearchTagGroups()`，使用 taxonomy id 將一般 tags 與 brands 分開計數；brands 只從 published products 計數，guides / links 仍只套用一般 tags。
- `SearchIdlePanel` 改吃 `popular_search_tags` 分組資料，依序顯示「熱門標籤」與「熱門品牌」，空分組不渲染。
- `search.vue` 改用搜尋 idle 專用 helper，避免原本 `getTagChips()` 的全量 chips 行為影響其他頁面。

### 測試

- `tests/published-products/tags.test.ts` 新增 unit coverage，驗證分組、`count > 3`、每組 max limit 與 draft content 排除。
- `tests/e2e/compact-app.spec.ts` 更新搜尋 idle regression，驗證兩個 heading、每組最多 10 個、所有 chip count 大於 3，並保留點擊 chip 送出搜尋的行為。
- `tests/nuxt-smoke.test.ts` 同步新文案。

### 驗證

- `pnpm test tests/published-products/tags.test.ts tests/published-products/compact-app.test.ts`：通過（2 files / 21 tests）。
- `pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts -g "separates search typing"`：通過（1 passed）。
- `pnpm test`：通過（25 files / 188 tests）。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
