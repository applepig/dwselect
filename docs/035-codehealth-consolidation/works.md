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

### M2-B: content-source module 整併＋AC2b 行為化＋AC1 fixture

- **技術決策**：
  - 新建 `scripts/content-source/`（函式式，ADR-035-1），共 6 檔：`is-missing-file-error.ts`（共用 ENOENT predicate，收 3 處重複中的 reader 兩份）、`list-json-files.ts`（async `listJsonDirents` 排序＋sync `listJsonFileNames` 檔名枚舉，共用 ENOENT→空集邏輯）、`read-published-json-entries.ts`（sync published JSON 讀取單一真相，simplify 收尾抽出）、`read-public-content-source.ts`（async 全讀＋schema parse，原 content-reader）、`read-taxonomy-items.ts`（sync 最小讀，route builder 用；`readPublished` 改用 `isPublished`）、`read-published-content-stems.ts`（sync route-stem 讀）。**async 全讀與 sync 讀刻意分檔**——route builder 在 nuxt.config 同步執行，不能 async，兩模式不硬合成單一 signature。`git rm` 舊 `content-reader.ts`、`read-published-taxonomy-items.ts`。
  - `PublicTaxonomies` 型別收斂到 app 側 `public-content-payload.ts`（無 fs），刪 content-reader 端重複定義、scripts 改 import。
  - 消費端全改接到 content-source：4 server routes、build-search-index／assert-content-images／build-public-artifacts／build-public-discovery／build-content-images、build-detail-by-id／build-public-content-payload、4 taxonomy route builders。`build-product-routes`／`build-guide-routes` 的 file-path 版私有 isPublished 收斂到 `readPublishedContentStems`（讀檔歸 content-source sync 模式、判定共用 isPublished）。`nuxt-smoke.test.ts` guard path、`content-reader.test`（git mv → `tests/content-source/read-public-content-source.test.ts`）、`AGENTS.md` 兩處架構指向皆 doc sync。
  - **AC2b**：新增 `tests/server/content-route-handler.test.ts`——content.json 斷 `version`/`products.cards`、search-index.json 斷 `version`/`documents.length`，比照 `detail-route-handler.test.ts` 的 nitro 全域 stub（`defineEventHandler` identity＋`setHeader` no-op；此二 route 無 404 分支故不 stub `createError`）＋動態 import default handler pattern。mutation probe（route return 改 `{version:999}`）驗證兩測試皆紅在斷言。刪三處 source-grep：`server-content-routes.test.ts` 的 content.json／search-index 字串斷言 it＋失去讀者的 `content_route_url`/`search_route_url` const；`detail-route-id-resolution.test.ts` 的 `toContain('extractContentId(event.path)')` it #1＋隨之無用的 `readFileSync` import 與兩 route_url const。保留 product/guide detail 字串斷言（行 99-123，不在本次範圍）與兩檔後半真跑 builder 的行為測試。
  - **AC1**：新增 `tests/content-source/draft-published-artifact-consistency.test.ts`——各型 2 published＋1 draft fixture 寫入 temp content dir。products／guides 五處（prerender routes、payload、search index、sitemap、RSS）id 集合一致且 draft 缺席；links 三處（payload、search、RSS）一致並斷言不進 prerender/sitemap detail；taxonomy sitemap 收錄＝`collectNonEmptyTaxonomyIds`（published-only）。EXPECTED id 集合**從 fixture spec 動態算**（`published_ids()`，非硬編數量，避開「寫死 fixture 數量」反模式）；sitemap/RSS 從實際產出 xml 解析（RSS guide/link 用外部 url，改以 title→id 對映；products 以 `/products/{id}` link 抽）。mutation probe（isPublished 恆真）驗證 3/4 條紅（draft 混入），taxonomy 條因測試側自算 published 不受影響（符合預期）。

- **/simplify 四角度審查（workflow fan-out＋對抗 verify）＋收尾**：對 M2 全 diff（A＋B）派 4 角度（reuse／simplification／efficiency／altitude）並行 find → 2 deduped → 逐條對抗 verify。**1 survivor 套用**：`read-published-content-stems` 與 `read-taxonomy-items` 的 `readPublished` 各自重寫同一 sync published JSON 讀取 pipeline（`listJsonFileNames → readFileSync+parse → filter isPublished`）——抽 `readPublishedJsonEntries(dir): { file_name, data }[]` 共用底座，兩處各留輸出投影（stem vs data）。派回 m2b worker 收尾，行為不變（AC1 consistency test 護欄）。**1 rejected（對抗 verify 擋下）**：`list-json-files` sync/async 過濾語意分歧屬刻意 behavior-neutral（本專案無 .json 子目錄、消費端當 set 且測試已 toSorted），改它須把 sync reader 投機硬化成 `withFileTypes`，違 YAGNI，不套用。

- **問題與解法**：
  - `isMissingFileError` 三處重複，M2-B 收斂 reader 兩份到 content-source 共用 helper；`build-content-images.ts:220` 內 readContentEntries 的 inline ENOENT（非具名 dup）**留 M6 一併處理**——M6 spec 明列 scripts 小重複（`getOptionValue×3`、`isMissingFileError×2`、CLI guard×3）收成 `scripts/cli-helpers.ts`，就地收斂會讓 M6 計畫 stale。收 M6 時對帳。

- **測試結果**（coordinator 獨立重跑，含 simplify 收尾後）：`pnpm test` **80 files / 554 passed**（M2-A 551 → +2 handler ＋4 AC1 −3 grep 刪除 = 554）exit 0；`pnpm lint` exit 0；`CI=true ./dev.sh typecheck` exit 0（volar noise 已濾）。
  - 測試設計 gate：AC2b `content-route-handler.test.ts`（真 invoke handler 斷 payload 觀測欄位）、AC1 `draft-published-artifact-consistency.test.ts`（id 集合相等＋動態算 EXPECTED＋xml 解析）皆為行為測試，無 source-grep／snapshot-as-spec／硬編 fixture 數量反模式。
  - 預期值對帳：AC1 EXPECTED_*_IDS 對映 fixture 的 published spec（各型 2 published、draft 缺席）；AC2b payload `version===1`、cards/documents non-empty 對映真實 content。
  - **未驗證**：generate 全綠（環境限制，交棒 CI/使用者，行為不變證據為全套件 554 綠＋typecheck 0）；`build-content-images.ts:220` inline ENOENT（M6 對帳）。

## Milestone 3: 站台 URL/名稱 env 化

- **技術決策**：
  - `getSiteUrl()` 放 `scripts/site-url.ts`（Node-only，讀 `process.env.APP_URL` 回 `https://${APP_URL}/`，**缺 env 於呼叫時 throw、無 module top-level eager throw**——避免 vitest/consumer import 即炸）。`SITE_NAME` 放 `app/utils/site-name.ts`（browser-safe 單一來源，無 env 依賴）。
  - **app 端 SITE_URL 烤入機制擇定：Vite `define`**（非 runtimeConfig，ADR-035-2）。nuxt.config guard 通過後 `const site_url = getSiteUrl()`，`vite.define.__DW_SITE_URL__ = JSON.stringify(site_url)`；`seo-metadata.ts` `declare const __DW_SITE_URL__; export const SITE_URL = __DW_SITE_URL__`。`vitest.config.ts` 同源 define（自 `getSiteUrl()`，已 loadEnvFile），測試與真實 build 同機制。**理由**：seo-metadata 純函式被 9 處（app.vue、5 pages、2 composable/util）＋tests 直接 import；runtimeConfig 方案會令 `getCanonicalUrl` 變 composable-only、侵入所有呼叫端並炸掉直接 import 的測試。define 保純函式、呼叫端零改動（除 SITE_NAME import 路徑）、head-before-await 不變式（ADR-1）未動、`product-detail-page-head.test.ts` 續綠。`SITE_OG_IMAGE` 隨 SITE_URL 導出（`${SITE_URL}og-image.png`）。
  - `nuxt.config.ts` guard（ADR-035-5 行為變更）：移除 `generate`/`build` 豁免（缺 APP_URL 一律 throw，含裸跑 generate）、移除 `?? 'dwselect.toybox.local'` fallback（`vite_host = app_url`）。
  - `build-public-discovery.ts`：原 module-level `const SITE_URL` 改成 `buildPublicDiscoveryFilesFromSource` 入口一次 `const site_url = getSiteUrl()`（fail-loud 在 build 進入點、非 import 時），thread 進 robots/llms/sitemap/rss/getProductUrl/getGuideUrl 全部 builder（保 helper 純函式、可測）。
  - `public-content-payload.ts` literal type `site.name`/`site.url` 由字面量放寬為 `string`（消除與 SITE_NAME/APP_URL 導出值的第二處平行定義）。SITE_NAME 9 個 app 消費端 + scripts（payload/discovery）全改 import `site-name.ts`（單一 auto-import 來源，消除 Nuxt「Duplicated imports」警告——seo-metadata 只 import 自用不 re-export）。

- **測試同步**：seo-metadata／launch-seo／taxonomy-page-seo／use-taxonomy-detail-page／public-discovery 的硬編 `dwselect.applepig.net` 期望值改為 domain-agnostic（由 `SITE_URL`/`getSiteUrl()` 導出，仍驗 canonical 拼接與 sitemap URL 結構，非套套邏輯）。刪 launch-seo 的「SITE_URL 不得含 toybox」不變式與 public-discovery 兩處 `not.toContain('dwselect.toybox.local')`——ADR-035-5/AC4 推翻「SITE_URL 永遠正式站」的行為，該行為從 spec 移除故連帶刪正確；**保留**改名後的「源碼不得寫死 site host」invariant（掃 app/ 源碼），守護「頁面不硬編 host」的行為仍在，覆蓋無真空。新增 `tests/site-url.test.ts`（env 注入 example.test/applepig.net、缺 env throw、SITE_NAME 同源）。

- **/simplify 四角度審查（workflow fan-out＋對抗 verify）**：9 found → 7 deduped → **0 survivor**（全部對抗 verify 拒絕，理由紮實）：`build-public-discovery` 的 site_url threading 是「入口 fail-loud + helper 純函式」慣用最小做法（inline 會違反 DRY／純函式）；define 兩處屬 trivial 重複（YAGNI，第三次才抽）；inline getSiteUrl 屬單次使用 inline-first；playwright.config 改接屬 scope 越界。無 finding 套用。

- **兩個 latent trap（經 verify 判定非缺陷、現況正確；記為未來風險供後續知悉）**：
  1. `__DW_SITE_URL__` 是 bespoke ambient global（`declare const`），非 Nuxt-native surface。若未來有**非 Vite bundler**（Nitro server route、plain node script）import `seo-metadata`，token 不會被替換 → bare `ReferenceError`（非 ADR-035-5 的可辨識訊息）。**目前無此 importer**（grep 確認只 app pages/composables + vitest + 兩處 config 注入，全 Vite 驅動），correct-as-shipped。加 Nitro/node importer 前需知悉此邊界。
  2. `buildPublicContentPayload` 執行時呼叫 `getSiteUrl()`（讀 env）——本專案 SSG（`nitro preset:'static'` + `/api/content.json` 於 prerender.routes + `failOnError`）無 live server，preview 也是送 prerender 好的靜態檔，無 request-time 問題；三路徑（.env/dev.sh/CI）單一 process 單一 APP_URL 無法 diverge。**未來若改 live server 部署**且 APP_URL 缺/異，content.json 可能 500 或 site.url 與 HTML canonical 分歧——屆時需留意。

- **測試結果**（coordinator 獨立重跑）：`pnpm test` **81 files / 557 passed**（M2 554 → +3：site-url 3 tests、SITE_NAME 同源等，減去部分整併）exit 0；`pnpm lint` exit 0；`CI=true ./dev.sh typecheck` exit 0（**無 Duplicated imports 警告**、volar noise 已濾）。
  - 測試設計 gate：`site-url.test.ts` 行為測試（env 注入 + throw）；改動測試改 domain-agnostic 仍驗拼接/結構行為，刪除為 ADR-035-5 推翻行為的正確同步。
  - 預期值對帳：`getSiteUrl()` example.test→`https://example.test/`、缺 env throw；canonical/og/sitemap/payload 全隨 SITE_URL 導出（測試環境 APP_URL=toybox，無殘留 applepig.net）；SITE_NAME 單一 `'DW嚴選'`。
  - **未驗證（交棒 CI）**：AC4 generate SSR prerender 端到端輸出比對、AC5 generate 缺 env 非零碼中止——此環境無 generate，`failOnError:true` 會在 CI 立即暴露 define 未觸達 SSR 的情況。人工開頁（環境限制，SEO meta 為不可見輸出，UI render 不變證據為既有 render 測試全綠）。

## Milestone 4: detail 共用 composable 與元件

> M4 面積大（3 composable/元件＋2 helper 收斂＋三頁改接＋測試行為化），依「可獨立綠燈、切面內聚」拆兩序列 sub-task：A＝back-navigation（AC7，護欄最脆弱處）；B＝破圖 composable（AC8）＋related 元件（AC9）＋route id／zip helper 收斂。前置 workflow 五角度偵察定位複製點與 10 個護欄不變式。

### M4-A: back-navigation composable（AC7）

- **技術決策**：
  - 抽 `useDetailBackNavigation(fallback_route): { goBack }`（`app/composables/use-detail-back-navigation.ts`），內聚 `canReturnToSameOriginPage` 全判定（history.state.back 優先於 document.referrer、protocol-relative `//` 視為外部、referrer origin `new URL` try/catch）。用 Nuxt 全域 `useRouter()`（不 import，讓測試 stubGlobal 攔截）。product fallback `/`、guide `/guide`。兩元件各移除 26 行逐字複製的 inline 判定＋`onBackClicked`＋top-level `useRouter()`（各 -41 行）。
  - **SSR guard 偏離（刻意，行為等價，已對帳接受）**：原元件用 `import.meta.client`（Nuxt 編譯期常數，bare vitest 恆 falsy 且 per-module 不可跨檔操控 → 所有 client-path 測試測不到）；抽出後改 runtime `typeof window === 'undefined' || typeof document === 'undefined'`。production 行為完全一致（window/document 存在 ⟺ client），`goBack` 僅 click 觸發（client-only）guard 純防禦，且使 composable 可單元測試——非遷就測試改行為。

- **測試（AC7 行為化）**：新增 `tests/use-detail-back-navigation.test.ts`（11 行為案例：SSR guard／history.length≤1／站內 history.state.back→back／**protocol-relative `//` 兩案：外部 referrer→fallback、同源 referrer→back（fall-through 驗證）**／referrer 空・同源・外部・非法 URL／fallback 參數化 `/` vs `/guide`）。移除 `product-detail-back-navigation.test.ts` it #1（8 個 source-grep `toContain`）＋專屬 readFileSync helper，保留 it #2-#4（render 斷言），describe 改名 `product detail hero opinion and layout ordering`；刪 `guide-detail-back-navigation.test.ts` 整檔（兩 it 皆 source-grep）。5 個 mount product/guide 元件的測試新增 `vi.stubGlobal('useDetailBackNavigation', 真 composable)`（auto-import 相容，import 真 composable 走真實 wiring，非假物件）。

- **測試結果**（coordinator 獨立重跑）：`pnpm test` **565 passed**（M3 557 → +11 composable −3 淨：移除 product it #1、刪 guide 整檔、新增 11 案例）exit 0；`pnpm lint` 0；`CI=true ./dev.sh typecheck` 0。測試設計 gate：composable 行為測試（spy router.back/push），無 source-grep／snapshot，Case 3 fall-through 完整。元件改接 diff 確認只動 back-nav、未牽動破圖/related（M4-B 範圍）。
- **未驗證**：頁面實開返回行為（環境限制，交棒 CI/使用者；行為由 composable 11 案例覆蓋）。
