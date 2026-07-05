# Works: 025 測試品質清理

## Milestone 1+2: 刪 CSS 數值斷言（A 類）＋清 grep 原始碼文字／順序／文件斷言（B 類）

M1 與 M2 合併於一次 `ddd-developer` 派工——A/B 兩類在 `nuxt-smoke.test.ts` 的同一個 `it()` 區塊內交錯，先後拆兩個 worker 開同一檔會把測試切成半殘再重開，反而易錯。

- **技術決策**：
  - 判準統一為「斷言原始碼／CSS 長什麼樣＝移除；斷言可觀測行為／resolved 值／token 存在／class 存在／對比度＝保留」（ADR-025-1）。有行為價值的 grep 依 AC7 改寫成 render／mock 行為測試，而非純刪。
  - `fetch-detail-helpers.test.ts`：整支 source-grep（斷言 helper 原始碼含函式簽名、不含 `readFile`）→ 改寫為 mock `$fetch` 行為測試，斷言 `fetchProductDetail/fetchGuideDetail` 打對 prerender 端點 `/api/{products|guides}/{id}.json` 並原樣回傳。
  - `product-detail-back-navigation.test.ts`：兩個「用 `indexOf` 比對 .vue 原始碼 class token 順序」的 B 類 `it` → 改寫為 `renderToString(ProductDetail)` 後對 **render 輸出** 斷言 DOM 順序（重構免疫，且 render 通過即證明元素真的存在、非 `-1` 假綠）。render harness 照 `view-transition.test.ts` 的 pattern 在本檔重建（stub NuxtLink/NuxtImg/CatalogPill/U*、`beforeAll` stub Vue auto-import global）。
  - `view-transition.test.ts`：移除 VT 的 CSS 宣告／數值 grep 與 route-import source-grep；保留 flag SSOT（resolved config）與 `renderToString` 的 view-transition-name 契約。
  - `nuxt-smoke.test.ts`（震央，~90% 為 source-grep）：38 → 18 個 `it`。刪整支 source-grep／文件 grep／CSS 數值 `it`；部分 `it` trim 為只留 protected keep（resolved `publicAssets`、`existsSync` guard、catalog.css class-existence、`--dw-*` token 存在、`getContrastRatio`、真實 taxonomy 斷言）。
  - **抽象門檻**：render harness 現於 `view-transition` 與 `product-detail-back-navigation` 各一份（2 consumer），依「第三次重複才抽象」暫不抽共用 helper；待第三個 consumer 出現再收斂。

- **問題與解法**：
  - `product-detail-back-navigation.test.ts` 首輪只移了 CSS 段，卻遺留兩個 `indexOf` source-order `it`（被誤判為「佈局行為」保留）。coordinator 驗收抓出＝B 類反模式，退回改寫為 render DOM 順序測試。
  - **交棒 035 的已知殘留**：同檔 `it #1`（`onBackClicked` same-origin/fallback）仍是 source-grep，刻意保留——035 AC7 會將 back-navigation 抽成 composable 並在 composable 層正式測試，屆時取代；025 先留作 025→035 過渡期的覆蓋，避免中間掉 back-nav 覆蓋。若 025 現在改寫，035 隨即丟棄＝白工。

- **測試結果**：
  - `./dev.sh test`（全套件，coordinator 獨立重跑）：82 files / 604 tests passed（清理前 634 → 604，-30）。
  - `./dev.sh lint`：exit 0，無 unused import／空 describe。
  - `/simplify`：四角度 inline 審查，無須套用修正（唯一 reuse 候選＝render harness 重複，因未達抽象門檻而保留）。
  - E2E（`compact-app.spec.ts`）本次未跑（需 host + dev server、非本次改動檔；VT/視覺回歸仍由它涵蓋）。

## Milestone 3: config/CI 字串改讀值或刪（C 類）

- **技術決策**：
  - 判準延續 ADR-025-1：斷言 config **文字**／CI YAML 字面／命令字串 pin＝反模式；改為讀 **resolved 值**（import 後讀物件）或 render 行為，行為已被別處涵蓋的純字串 grep 直接移除。coordinator 先做完逐檔 keep/remove/rewrite 決策再派工，worker 只執行不重判（避免 M2 那種「誤判佈局行為而留 grep」的來回）。
  - **兩檔整檔刪除**：`static-generate-workflow.test.ts`（100% grep `.github/workflows/*.yml` 文字＋`indexOf` 順序，GitHub Actions 觸發行為非 unit 可測，無 resolved 值路徑，CI 正確性由 CI 執行本身把關）；`agent-quality-gate-config.test.ts`（讀 opencode/codex/claude config JSON 後 `JSON.stringify().toContain()` 文字 grep，hook 真實行為已由 `post-edit-hook.test.ts` 實跑 ESLint 涵蓋）。兩者皆 test-only、git 可回溯，AC3 授權「移除」。
  - **改讀 resolved 值**：`app-config.test.ts` theme baseline 改 `import app.config` 讀 `app_config.ui.colors.primary/neutral`（`vi.hoisted` 把 Nuxt auto-import 全域 `defineAppConfig` stub 成 identity，讀出 default export 即 resolved config——是達成「讀值」判準的必要 harness，非放寬斷言）；GTM 改讀 `nuxt_config.app.head.script[0].innerHTML`／`noscript[0]` resolved 值（重排 nuxt.config source 佈局不再誤紅，只在實際 head 設定改變時紅）。
  - **改行為測**：`launch-seo.test.ts` metadata contract 由 grep 頁面 `.vue`/`.ts` source 改為 import `seo-metadata.ts` 常數斷值 + `getCanonicalUrl`/`getSeoDescription` 純函式行為斷言；toybox.local 防漏改對 import 進來的常數斷言（各頁都用這些常數，守常數即守輸出）；error page 由 grep `error.vue` source 改 `@vue/test-utils` `renderToString`（404→找不到頁面、500→發生錯誤，皆含回首頁 `href="/"`）。
  - **精簡命令字串 pin**：`dev-server-script.test.ts` 刪 3 個 `it`（`--host` pin、quality-gate 命令 `toBe` pin、playwright source-order grep），**保留** allowedHosts resolved 讀值 + 全部 15 個 runDevSh 行為測項；`lint-config.test.ts` 4→1（只留實跑 `eslint --version` 斷 v9，stylistic 規則效果由 post-edit-hook fixable.ts 涵蓋）；`nuxt-smoke.test.ts` 刪 2 個 generate/build script 命令字串 pin `it`，**保留** `@nuxt/content`/`better-sqlite3` 缺席的架構守門（SSG「runtime 不依賴外部資料」不變式，refactor-immune）。
  - **保留不動**：`post-edit-hook.test.ts`（全為實跑 hook 的行為/執行測項）一行未動。

- **問題與解法**：
  - `app.config.ts` 的 `defineAppConfig` 是 Nuxt auto-import 全域，bare vitest 首次 import 報 `defineAppConfig is not defined`。用 `vi.hoisted` 在模組 import 前 stub 成 identity function 解決——這是「讀 resolved 值」判準的必要前置，讀出的仍是真實 config 物件。
  - coordinator gate-check 抽查改動檔：確認 `vi.hoisted` stub 是讀 resolved 物件而非 source-grep 換皮、launch-seo 頁面 source grep 全清、無殘留反模式，通過。

- **測試結果**：
  - `./dev.sh test`（全套件，coordinator 獨立重跑）：80 files / 587 tests passed（M2 後 604 → 587，-17；含刪 2 整檔）。
  - `./dev.sh lint`：exit 0。
  - `/simplify`：inline 四角度審查，無須套用修正（render harness 同一函式仍僅 2x 重複，未達抽象門檻）。

## Milestone 4: adoption 測試行為化（D 類）

- **技術決策**：
  - 先做覆蓋比對再動手（AC4 要求「先確認行為是否已被涵蓋，未涵蓋才補 render」）。確認 `search-input-component.test.ts`（render/mount）已涵蓋 search-input 的 emit `update:query`/`submit`/`clear`、clear 鈕只在非空白 query 顯示、Enter 於 IME composition 不 submit、composition defer/sync；`search-idle-panel-component.test.ts` 已涵蓋 idle chip 深連 `/tag/{id}`·`/brand/{id}` 與 count。adoption 檔中重複斷言這些行為的 source-grep 一律刪（行為已在別處以 render 覆蓋）。
  - `nuxt-ui-component-adoption.test.ts`（9→7 it）：**保留** `mountIndexPage` + 3 個 mount 行為測項（CategoryChipBar 委派、legacy category 軟導向、it.each 無效 query）。**刪** `search input adopts UInput` describe（5 it 全 grep source，行為已覆蓋）、tag-explorer grep it（035 將整支移除 `tag-explorer.vue`，依交界規則只拔不改寫）、idle-panel grep it（已覆蓋）、3 個 CSS grep it（migration-cleanup `.category-chip.is-active` not.toContain + `min-height:38px` A 類數值 + 與 nuxt-smoke 重複的 `.category-chip:focus-visible` class 存在）。**新增** home 空狀態 render 測項（`mountIndexPage({ products: [] })` 斷言文案「目前沒有已上架商品」；`UEmpty` stub 改為渲染 `title` prop）。
  - `search-input-component.test.ts`（7→8 it）：唯一未被涵蓋、有行為價值者——search-input 顯式轉發的 mobile 鍵盤/autofill 屬性（`enterkeyhint`/`autocomplete`/`autocapitalize`/`autocorrect`/`spellcheck`）——遷到此 canonical 行為檔，以 render 斷言落在實際 `<input>` 上（UInputStub 已把 attrs 展開至內層 input）。
  - `product-detail-back-navigation.test.ts`（3→4 it）：把「DW callout 顯示 long_description/summary」這個有價值且未被別處斷言的行為，遷入此已 render `ProductDetail` 的檔——`UAlertStub` 由 `<div />` 改為渲染 `{{title}}<span>{{description}}</span>`（DW callout 走 `:description` prop），新增測項斷言 html 含「DW 怎麼說」與內文。既有兩個 order 測項（`detail-dw-says` indexOf）確認不受 UAlert 補內容影響、仍綠。`it #1`（back-nav source-grep）依交界續留 035，未動。
  - `nuxt-ui-empty-and-callout-adoption.test.ts`：**整檔刪**（`git rm`）。逐項去向：home 空狀態行為→遷 component-adoption render；guide/links/search 空狀態為同一 adoption pattern 複本（copy/視覺、E2E 涵蓋頁面），不逐頁重測；product-detail DW callout 內容→遷 back-navigation render；back button 的 `router.back()`/`onBackClicked`→屬 035 back-nav 收斂（結構存在性由 `detail-back` order 測項涵蓋）；catalog.css drop（`.compact-empty-state`/`.detail-callout`/`.empty-title`）→ CSS migration-cleanup grep，無行為。
  - **035 交界遵守**：tag-explorer 與 back-nav 行為斷言一律「只拔不改寫」或續留，不投入成本改 render 後被 035 丟棄。

- **問題與解法**：兩處預留 fallback（home 空狀態 render 難觸發、UAlert 內容渲染難處理）皆未觸發——worker 實測 index.vue 空狀態分支可在 mount harness 觸發、DW callout 走 `:description` prop 可由 stub 渲染，兩者皆成功實作為 render 行為測試，無降級成 source-grep。

- **測試結果**：
  - `./dev.sh test`（全套件，coordinator 獨立重跑）：79 files / 570 tests passed（M3 後 587 → 570，-17；含刪 1 整檔 + 淨刪多個 grep it、新增 3 個 render it）。
  - `./dev.sh lint`：exit 0。
  - `/simplify`：inline 四角度審查，無須套用修正（DW callout render 複用既有 `renderProductDetail`，未新增第 3 份 harness）。
  - coordinator gate-check：確認改動檔無殘留 source-grep 行為測項（僅 `it #1`、`named constant 229` 兩個既有 grep 依指示續留），新增測項皆為真 render/mount 行為斷言。

## Milestone 5: 釘死 content 資料值清理（E 類）＋ C/B 類 residual sweep

- **決策脈絡**：E 類本體很小（真實 content 值 pin 只命中 nuxt-smoke 兩行）。但 coordinator 做 E 類全套件盤點時，發現 M2（B 類）/M3（C 類）的檔案清單漏掉同類反模式的 straggler（spec inventory 明言非窮舉）。經使用者裁示採「全量 residual sweep」：E 類 ＋ 逐檔判準後清理 C/B 類 straggler。判準延續 ADR-025-1/3，並區分兩種 source-grep 性質——「red≠行為」的實作快照（清）vs「red=真實行為破壞」的 wiring/回歸守門（在無 proportionate 行為替代時保留）。
- **技術決策（逐檔）**：
  - `nuxt-smoke.test.ts`（E 類）：taxonomy `it` 移除釘死真實 slug+label 的兩行（`av-theater/影音劇院`、`pchome/PChome`）——新增/改名分類即無關誤紅（ADR-025-3）；改為 category/channel/tag 三者 `items.length > 0` 不變式（對齊既有 tag 那行）。parse JSON（結構有效）與 content.config-absent 保留。prerender count `it` 不動（`countPublishedContent` vs prerender routes 是雙邊同源不變式，新增商品兩邊一起動、不誤紅）。
  - `public-discovery.test.ts`（C 類 straggler）：移除 5 條 `package.json.scripts` 命令字串字面斷言（`build:public-discovery`/`build:search-index`/`build:public-artifacts`/`build`/`generate`）——與 M3 從 nuxt-smoke/dev-server 移除的同類；連帶刪 unused package.json 讀取。**保留** `readPublicContentSource` 單次讀取 `match(...).toHaveLength(1)`（028 單次讀取 perf 守門）與兩行 composition wiring `toContain`——這三行仍是 source-grep 形式，但屬「無行為替代的 perf/wiring 守門」，列為 documented residual（後續要收斂需另立行為替代）。fixture-based sitemap/rss/robots 測項全留。
  - `category-chip-bar.test.ts`（B 類 straggler）：刪「desktop css contract」`it`（pin 精確 CSS 宣告文字＋whitespace 的 A/B grep）——桌機隱藏真實行為由 Playwright/agent-browser（AC8/AC9）驗，該 it 註解自承；移除 unused `CATALOG_CSS`/import。5 個 mount render 行為測項不動。
  - `taxonomy-page-shell.test.ts`（B 類 straggler，rewrite）：3 個 `.vue` source-grep `it` → render 行為測試（四頁可 render，有 proportionate 替代）。mount 各頁、`vi.stubGlobal('useTaxonomyDetailPage', spy)` 攔截，斷言：以正確 kind 接線 composable（`spy` 收到 `'category'|'tag'|'brand'|'channel'`）、組成共用 `TaxonomyPage`（`findComponent` 存在＋不 inline `product-grid`/`ResourceList`）、CategoryChipBar 僅 category 頁（非目標邊界守門）。refactor-immune。
- **保留不動（判準與理由）**：
  - `server-content-routes.test.ts`（89–133 route source-grep）、`server/detail-route-id-resolution.test.ts`（it#1 `extractContentId(event.path)` grep）：**wiring/回歸守門**——route 的 null→404 轉譯、h3 event.path 取 id 的回歸點（028 曾因只斷言字串而漏掉的覆蓋洞）只有這裡守；behavior 由 direct-call 測涵蓋，但 handler 本身無 invocation 測。正解是 handler-invocation 改寫，對本測試品質 sprint 不成比例、盲刪違反 AC7 → 保留為 documented residual guard，留待未來 handler-invocation 測試或 035 一併處理。
  - `guide-detail-back-navigation.test.ts`：兩 it 全 back-nav source-grep、無 CSS → 035 交界（035 AC7 收斂成 composable 後測），整檔不動（比照 product-detail `it #1`）。
  - `build-content-images`/`search-index`/`product-schema`/`content-taxonomy-references`/`content/extract-content-id`：fixture-based／資料健檢不變式（`=== []`、`length>0`）／純函式合成輸入行為，皆 KEEP。
- **測試結果**：
  - `./dev.sh test`（全套件，coordinator 獨立重跑）：79 files / 575 tests passed（M4 後 570 → 575，+5；rewrite 的 it.each 展開 case 淨增）。
  - `./dev.sh lint`：exit 0。
  - `/simplify`：inline 四角度審查，無須套用修正（`mountTaxonomyPage` 與既有 mount harness 僅共用薄 Suspense+stubGlobal pattern、元件各異，未達抽象門檻）。
  - coordinator gate-check：taxonomy-page-shell rewrite 確認為真 render/spy 行為斷言（非 grep 換皮）；保留檔案一律未觸碰。
