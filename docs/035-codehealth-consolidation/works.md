# Works: 035 Code Health 收斂

> 分支：`feat/035-codehealth-consolidation`（2026-07-07 base reset 至 025 tip `79ff19f`，站在 025 全部測試整理之上；避開 M2/M4 動同批測試檔的衝突，經使用者確認）

## Milestone 1: 化石清運

- **派工**：N=1（無 🔀 平行工作線），派 `ddd-developer` 執行。coordinator 動工前平行偵察九項清運對象的位置與消費端牽連，寫進派工 prompt（特別標註 compact-app 欄位有活消費端、Google Sheets guard 三件原子移除、build script 保住子命令、search-index legacy union 確認無 caller）。

- **技術決策**：
  - **tag-explorer**：`git rm` 元件本體；`catalog.css` 只刪專屬 selector（`.tag-explorer`/`.tag-toolbar`/`.selected-tags-note`/`.clear-tags-button` ＋其 `:focus-visible`）。worker 偵察修正：`.tag-chip`/`.tag-chip-list`/`.tag-count` **非** tag-explorer 專屬——`search/search-idle-panel.vue` 仍在用，保留（不誤刪共用 class）。
  - **format-published-date**：util 與其測試檔一併刪（零 production 消費端）。
  - **compact-app 瘦身（最高風險項，套 Case 6 型別檢查）**：移除 view 的 `tabs`/`active_tab`/`counts` 欄位與不可達的 `'no-results'` 分支（`getEmptyReason` 兩入參恆等，該支永不觸發）。連帶死碼 cascade：`normalizeCompactTab`／`COMPACT_APP_TABS` 死→刪、`getCompactAppView` 的 `state` 參數失去唯一讀者→移除、index/guide/links 三頁只餵該參數的 `route_state` computed 隨之死→移除（`route_state` 從未參與 render，輸出不變）。分辨清楚：`use-catalog-shell-data.ts:31` 讀的是 payload 的 `navigation.counts.products`（≠ view 的 counts），保留；`search.vue` 的 `'no-results'` 是它自己的 `search_empty_reason`，與 compact-app 無關，未動；`CompactAppState`／`getCompactAppStateFromRoute`／`CompactAppTabId` type 仍被 NAV_TABS＋search.vue＋state 測試消費，保留。
  - **search-index legacy union**：grep 確認零 caller 傳 `Product[]`（全走 `SearchContentInput` 物件形式），移除兩處 union 與整個 `normalizeSearchContentInput`（Array 分支已死）。
  - **搜尋歷史直寫軌**：以「零 production 消費端」為判準，移除 `readSearchHistory`／client-search 版 `saveSearchHistoryItem`／`clearStoredSearchHistory`；保留 composable 軌 `useSearchHistoryItems`、純函式 `appendSearchHistoryItem`（use-search-page:158 在用）、`clearSearchHistory`。測試連帶同步：`appendSearchHistoryItem` 原本零直接測試、行為僅透過被刪 wrapper 覆蓋，故把 dedupe/latest-first/12-limit＋trim/blank-filter 覆蓋**改寫指向存活的 `appendSearchHistoryItem`**（存活行為不失覆蓋）。
  - **殘留 build script**：移除 `package.json` 的 `build` entry；`build:public-discovery`（dev.sh:159 活）、`build:search-index`／`build:public-artifacts` 皆未連累。
  - **Google Sheets guard 三件組（ADR-035-6 原子移除）**：同一批次刪 `scripts/assert-runtime-google-sheet-clean.ts`＋`tests/runtime-google-sheet.test.ts`＋`static-generate.yml` 的 step。額外連帶 doc sync：`README.md`、`AGENTS.md` 對該 script 的敘述一併移除（避免 stale 指向）。
  - **migration scripts 移 legacy**：偵察修正——`scripts/legacy/` 已存在（含三個先前的 migrate script）。`git mv` `migrate-content-slug.ts`／`localize-content-images.ts` 進 `scripts/legacy/`；三個對應測試移入新 `tests/legacy/`（含既在 legacy 但仍跑的 `migrate-product-compact-schema.test.ts`）並修 import；`vitest.config.ts` exclude 加 `tests/legacy/**`。
  - **toybox crt gitignore**：`toybox-local-root-ca.crt` 加入 `.gitignore`。

- **問題與解法**：
  - compact-app 的 `counts` 曾疑似有活消費端（`use-catalog-shell-data` 讀 `navigation.counts.products`）——經型別/來源分辨確認那是 payload 層 counts，與 view 層 `counts` 不同源，view 層屬死欄位可刪，payload 層保留。
  - `search.vue` 的 `'no-results'` 與 compact-app 的 `'no-results'` 同名不同源，分辨後 search.vue 未動。

- **/simplify 四角度審查 + 收尾**：派 4 個並行 agent（reuse／simplification／efficiency／altitude）審 M1 diff（-529/+43，刪除為主）。三個角度收斂到唯一 finding：**`active_tab` 半截清運孤兒**——view 側 tabs/active_tab/counts 已清，但 route-state 側 `getCompactAppStateFromRoute` 仍為四 branch 產出無人讀的 `active_tab`（`search.vue` 只讀 `search_query`），留下型別孤兒（`CompactAppTab.active`、`CompactAppState.active_tab`）與鎖死值測試。此 finding 在 spec M1 範圍內（M1 明列移除 `active_tab` 分支），且後續 milestone 皆不碰 compact-app route state → 派回 m1-fossil 收尾：`getCompactAppStateFromRoute` 退化為「僅 /search 抽 search_query，其餘回 `{}`」、`CompactAppState`／`CompactAppTab` 移除孤兒欄位、NAV_TABS 型別去 `Omit<>` 繞路、`normalizeCompactTab`／`COMPACT_APP_TABS` 消除、route-driven 測試 7→4 整併＋`selectable-category-ids.test.ts` 7 處死值斷言改 `toEqual({})`（觀測輸出，非快照）。保留 `CompactAppTabId`（NAV_TABS 用）與 `CompactCategoryChip.active`／`CompactTagChip.active`（活欄位）。

- **測試結果**（含 simplify 收尾）：
  - `pnpm test`（coordinator 獨立重跑）：**77 files / 547 tests passed**（025 base 576 → 化石清運 550 → active_tab 收尾整併 547；減少為連帶刪除的死碼測試、移出預設集的 migration 測試、route-driven 死值斷言整併）。
  - `pnpm lint`：exit 0。
  - typecheck：`CI=true ./dev.sh typecheck`（host 直跑 `pnpm exec nuxt typecheck`）**exit 0**、零 TS error（volar `sfc-route-blocks` MODULE_NOT_FOUND 為已知非致命 noise）；驗證 compact-app 欄位移除＋型別鏈收斂、search-index 簽章收斂與消費端更新皆 type-safe。（此 session 容器途徑因 host↔uid 權限不匹配 crash loop 不可用，改走 host 直跑；見 memory host-cannot-validate-runtime。）
  - coordinator 測試設計 gate：改寫檔（`client-search.test.ts`、`compact-app.test.ts`、`selectable-category-ids.test.ts`）確認為正確連帶同步（被刪行為的測試連帶刪、存活行為改指向存活 API、死值斷言改觀測輸出），無 source-grep／snapshot 反模式。

- **未驗證 / 待人工**：
  - 首頁／guide／links／search 頁人工開頁確認 render 不變（host 無法開 toybox.local，AC10 render 不變證據為既有 render 行為測試全綠）。
  - AC11「可隨時復活」的操作方式：因 vitest `exclude` 優先於顯式路徑，復活 legacy 測試需暫時移除 exclude 的 `tests/legacy/**` 一行（非用路徑覆蓋）。

## Milestone 2: content-source module

> M2 面積大，依「可獨立綠燈、檔案不重疊」拆兩個序列 sub-task（B 依賴 A）：A＝isPublished 收斂＋消費端改接＋guide resolver 去重；B＝content-source module／reader 整併／PublicTaxonomies 收斂／AC2b／AC1 fixture。各自 commit。

### M2-A: isPublished 單一化＋消費端全改接＋guide resolver 去重（AC3、AC2 骨架）

- **前置偵察（workflow 五角度 fan-out）**：spec 明示 published 消費端清單「起點非全集，動工前全域掃補全」——偵察補到 **5 處漏網 inline**（spec 未列）：`map-related-product-card.ts:27`、`map-guide-detail.ts:42`、`map-resource-rows.ts:11/:18`、`build-content-images.ts:174`（反向式 `!== 'published'`）。另確認 `product-schema.ts:159`（`status === 'published' && !has_image_file`）語意是 schema 驗證規則（published 商品必須有圖），非 published 過濾，**排除於收斂之外**。

- **技術決策**：
  - `isPublished` 抽 `app/utils/content/is-published.ts`——browser-safe 純 predicate，**零 import、獨立單檔、不經 barrel/re-export**。刻意如此：search-index 經 client-search 進 browser bundle，若 predicate 依賴鏈碰到含 `node:fs` 的 reader（如 public-content.ts 尾端 re-export 的 `buildPublicContentPayload` → content-reader.ts）會炸 client bundle（xreview finding）。移除 `public-content.ts:9` 的 seed 定義（該檔保留 SITE_* 常數與 payload re-export，屬 M3/其他範圍）。
  - 全 15 個消費端改接：4 處原已呼叫 seed 改 import 來源；`build-navigation.ts:23/:87`、`search-index.ts:159/:163/:167` inline → `.filter(isPublished)` point-free；5 處漏網 inline 改呼叫；`build-content-images.ts:174` 反向式改 `!isPublished(...)`。
  - `build-content-images.ts:174` 用 localized `entry as { status: string }` cast（entry 來自 defensive JSON parse、status 型別 unknown）＋Why 註解，而非放寬共用 predicate signature 到 `{ status: unknown }`——後者會弱化其餘 15 處 call site 的型別保護。排除語意與原 `!== 'published'` 完全一致。
  - guide image resolver 去重（AC3）：刪 `search-index.ts:390-392` 的 `resolveGuideSearchImageUrl`（與 canonical `resolveGuideImageUrl` 函式體完全等價），`:302` 改呼叫 canonical，檔頭改 import；連帶移除 `resolveImageFileUrl` import（該檔內已無其他用途，grep＋typecheck 雙證無殘留 reference）。detail 頁本已用 canonical（`map-guide-detail.ts:22`），故收斂後搜尋結果與 guide 頁縮圖共用同一 resolver。

- **問題與解法**：
  - worker 另修 `tests/server/detail-route-handler.test.ts:5`、`tests/server/detail-route-id-resolution.test.ts:7` 的 `isPublished` import（原自 public-content）——移除 seed 定義後這兩檔會編譯失敗的必要連帶修正，只改 import 行、未動 it 內容；後者是 AC2b 的 it #1 刪除對象，同分支順序作業不衝突（M2-B 知悉此 import 已指向新模組）。

- **測試結果**（coordinator 獨立重跑）：`pnpm test` **78 files / 551 passed**（M1 收尾 547 → +4 為 is-published 單元測試）；`pnpm lint` exit 0；`CI=true ./dev.sh typecheck` exit 0（volar noise 已濾，真實碼 0）。isPublished 單元測試斷言值對映 `product-schema.ts:6` 的 status enum（published→true，draft/unpublished/archived→false），worker 以 mutation probe（翻 `===`→`!==`）驗證 4 tests 全紅→還原。
  - 測試設計 gate：`is-published.test.ts` 為行為測試（斷言回傳值），無 source-grep／snapshot 反模式。
  - **未驗證**：generate／開頁（環境限制），行為不變證據為既有全套件綠。
