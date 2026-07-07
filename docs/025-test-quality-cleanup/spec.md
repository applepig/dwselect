# 025 測試品質清理（Test Quality Cleanup）

> 狀態：已完成（2026-07-05；M1–M6 執行完畢，經三模型 cross review 驗收並修正 findings）
> 建立日期：2026-06-21；修訂日期：2026-07-05
> 分支：`025-test-quality-cleanup` rebase 到最新 `master` 後執行（025 先於 035，見「與 035 的關係」）
> 來源：原草稿自 022 HEAD；本次修訂對齊 028–033 已合併的程式碼現況，並承接 035 spec 交付的 scope

## 修訂說明（2026-07-05）

原草稿（2026-06-21）之後，專案歷經 028（payload 拆分）、029（build 隔離 + `dev.sh` 統一入口）、030（CI deploy 拆分）、031/031.1（taxonomy 導覽 + VT morph）、032（code health 去重）、033（product reference links）陸續合併，測試套件由當時規模成長到 **82 檔 / 634 案，目前 `pnpm test` 全綠**。因此本次修訂：

- **原「止血紅燈」前提作廢**：草稿的核心症狀「`dev-server-script.test.ts:9`（`scripts.dev === 'nuxt dev'`）正紅」已由 029 整支改寫 `dev-server-script.test.ts` 解決（現為跑 `dev.sh` 斷言 log 輸出的行為測試）。M1 不再需要。
- **所有行號重新對齊**：草稿引用的行號幾乎全數位移；本版改以「反模式 + 截至目前 HEAD 的代表落點」描述，**模式判準為 SSOT，行號僅供定位、會再漂移**。
- **新增 spec 撰寫後長出的反模式檔案**：`category-chip-bar`、`guide-detail-back-navigation`、`launch-seo`、`fetch-detail-helpers`、`view-transition`（自 `product-detail` 拆出）等。
- **承接 035 交付的第二塊 scope**：035 spec 明列「025 另案涵蓋：source-grep 假斷言測試存量清理、**釘死 content 資料值的測試**」。後者為新範圍（見 E 類）。
- **標注與 035 的相依與排序**（見專節）。

## 背景

測試套件累積了大量「把原始碼當純文字 grep」的測項——用 `readFileSync` 讀 `.vue` / `.css` / `.ts` / `nuxt.config` / `package.json` / CI YAML / `README.md` / `AGENTS.md`，再 `toContain('某段字串')` 斷言。這些斷言的是「實作長什麼樣」而非「行為對不對」，導致：

- 任何無害的改名、格式化、視覺微調都會誤紅（false positive）——032 的多輪具名化 refactor 就被迫連帶改動這些測試。
- 動一點 production code 就要連帶改一堆測試。
- 真正測行為的測項被大量低價值字串斷言稀釋，review 噪音高。

此外還有第二類脆弱源：**釘死真實 `content/` 資料值的斷言**（例如以實際商品筆數、實際 slug 做 `toHaveLength` / `toContain`），會在內容編輯新增或調整品項時無關地誤紅——這類與 source-grep 同屬「斷言不該斷言的東西」，由 035 交付本 sprint 一併清理。

> 對照：以**合成 fixture** 產生固定筆數再斷言（如 `search-index.test.ts` 的 `documentCount`、autocomplete 上限 12、13 筆 shared-token 的排序截斷）是**行為測試，保留**——判準是資料是否為測試自產，而非有沒有出現數字。

## 目標

1. 移除「斷言實作文字／寫死 CSS 數值／寫死 config 字串／grep 另一支測試原始碼」這類脆弱、無行為價值的測項。
2. 把有行為價值但用 source-grep 實作的測項，改寫成 render DOM／讀 resolved 值的真行為測試（或確認既有 E2E 已涵蓋）。
3. 移除「釘死真實 `content/` 資料值」的脆弱斷言，改為對合成 fixture 斷言或改測不隨內容變動的性質。
4. 測試套件維持全綠，且行為覆蓋不退步。

## 非目標

- 不新增功能、不改 production 行為（純測試層整理；唯一 production 觸碰是必要時為了可測性的最小調整，需另行記錄）。
- 不動「行為型」好測試（見下方保留清單）。
- 不重寫 E2E 策略、不導入新測試框架。
- **不重複 035 的工作**：035 因移除程式碼而連帶刪除的測試（`TagExplorer`、`format-published-date`、`migrate-content-slug`、`localize-content-images` 等），以及 035 將 back-navigation／破圖 fallback 收斂為 composable 後改寫的對應測試，一律歸 035，本 sprint 不碰（見「與 035 的關係」）。

## 驗收條件

- AC1：CSS 數值字串斷言（exact `padding` / `block-size` / `grid-template-columns` / `min-height` / `--detail-back-inset` / `width: min(...)` 等）全數移除；保留「class／`--dw-*` token 存在」與對比度（`getContrastRatio`）類行為斷言。
- AC2：「grep 原始碼文字內容／token 順序／文件用字」類測項移除——含「一支測試去 `readFileSync` 另一支測試原始碼」與讀 `README.md` / `AGENTS.md` 文字者；有行為價值者改寫成 render／讀值斷言。
- AC3：寫死 config / CI YAML 字串的測項移除或改為讀 resolved 值斷言（保留讀 `nuxt.config` 實際 `allowedHosts` 值、以及實際執行 hook 跑 ESLint 的行為測項）。
- AC4：兩支 adoption 測試中具行為價值者（IME 不誤送、有 query 才顯示 clear 鈕、空狀態渲染）改寫成 `@vue/test-utils` render／既有 E2E 涵蓋；純文字／CSS 數值斷言移除。
- AC5：釘死真實 `content/` 資料值的斷言移除或改為對合成 fixture 斷言（E 類）。
- AC6：`pnpm test`、`pnpm lint`、`pnpm typecheck`、`./dev.sh verify` 全綠。
- AC7：行為覆蓋不退步——刪除的測項若仍有行為價值，須在 unit render 或 E2E 有對應覆蓋。

## 範圍盤點（依不合理程度排序；行號截至目前 HEAD，會漂移）

### A. 寫死 CSS 數值（純視覺、零行為）→ 刪除
- `tests/nuxt-smoke.test.ts`（約 275–333、573–609 區段：`block-size`、`padding`、`grid-template-columns`、`margin-inline`、`--nav-*-width` 等 exact 值）
- `tests/product-detail-back-navigation.test.ts`（約 40–145：`--detail-back-inset: 12px`、`grid-template-columns`、`width: min(100%, 240px)` 等）
- `tests/view-transition.test.ts`（讀 `catalog.css` 的數值斷言）
- `tests/nuxt-ui-component-adoption.test.ts`（約 219–221：`min-height: 38px`、`padding-block/inline`）
- 保留：`nuxt-smoke.test.ts` 的 `getContrastRatio` 對比度斷言、`--dw-*` token 存在性斷言。
- 待現場複查：`category-chip-bar.test.ts`、`guide-detail-back-navigation.test.ts` 是否含同類 CSS 數值 grep（新增檔案，執行時逐案判別）。

### B. grep 原始碼文字／順序／文件用字 → 刪除（必要者轉行為測試）
- `tests/nuxt-smoke.test.ts`：
  - `readFileSync` 另一支測試原始碼再 `toContain`（約 81–83，grep `product-schema` 測試的 dir 字串）
  - 讀 `README.md` / `AGENTS.md` / composables／pages 目錄清單做文字或存在斷言（約 96–115）
  - grep `nuxt.config` source 字串（約 46–48、175）
  - grep 元件 source（約 540–543：`compact_view.links.length` 等）
  - source token 順序比對（`indexOf` / `token_positions`，約 616 一帶）
- `tests/fetch-detail-helpers.test.ts`：`readFileSync` `fetch-product-detail.ts` / `fetch-guide-detail.ts` 做字串斷言的部分（若有行為斷言則保留行為部分）。

### C. 寫死 config / CI 字串 → 刪除或改讀值
- `tests/dev-server-script.test.ts`：`scripts.dev/test/lint/typecheck/preview` 逐一 `toBe('./dev.sh X')` 的字面斷言（約 21–30）→ 精簡；**保留**跑 `dev.sh` 斷言 log 輸出的行為測項（029 後主體）與讀 `nuxt.config` `allowedHosts` 值者（約 38–41）。
- `tests/nuxt-smoke.test.ts`：整段 generate/build script 字面斷言。
- `tests/static-generate-workflow.test.ts`：逐行 grep deploy CI YAML（030 拆分後，全檔約 84 行幾乎都是 YAML 文字斷言）。
- `tests/app-config.test.ts`、`tests/lint-config.test.ts`、`tests/agent-quality-gate-config.test.ts`：grep config / eslint 設定文字。
- `tests/post-edit-hook.test.ts`：**保留**實際執行 hook 對 `broken.ts` / `fixable.ts` 跑 ESLint 的行為測項；移除純 grep hook 原始碼文字者。
- `tests/launch-seo.test.ts`：新增檔案，執行時判別是讀 resolved SEO 值（保留）或 grep source（處理）。

### D. adoption 測試 → 行為價值者改寫，純文字者刪
- `tests/nuxt-ui-component-adoption.test.ts`（約 225 行）
- `tests/nuxt-ui-empty-and-callout-adoption.test.ts`（約 91 行）
- 具行為價值者（IME composition 不誤送、有 query 才顯示 clear 鈕、空狀態／callout 渲染）優先確認是否已被 `search-input-component.test.ts`、`search-input-composition.test.ts`、`search-idle-panel-component.test.ts` 或 E2E `compact-app.spec.ts` 涵蓋；未涵蓋者以 `@vue/test-utils` render 補上，再刪原字串斷言。

### E. 釘死真實 `content/` 資料值（035 交付）→ 移除或改對合成 fixture
- 執行時盤點讀真實 `content/` 的測試：`nuxt-smoke.test.ts`（`countPublishedContent('../content/products/')` 一帶，約 699）、`public-discovery.test.ts`、`server-content-routes.test.ts`、`nuxt-smoke` taxonomy 讀取段。
- 判準：斷言值是否隨內容編輯新增品項而無關誤紅。
  - **是**（釘死實際筆數／實際 slug）→ 改為對合成 fixture 斷言，或改測「published 一律收錄、draft 一律缺席」這類不變性質。
  - **否**（`product-schema.test.ts` 逐筆對 real content 跑 schema.parse、`taxonomy.items.length > 0` 這類）→ 保留，屬合理的資料健檢。

### 保留（行為型好測試，不動）
`client-search.test.ts`、`search-index.test.ts`（含合成 fixture 的筆數／截斷斷言）、`search-tokenizer.test.ts`、`product-schema.test.ts`（schema 健檢部分）、`build-*-routes.test.ts`、`server-content-routes.test.ts`、`content-markdown*.test.ts`、`public-payload/*`、`published-products.test.ts` 中對 fixture 的行為斷言、E2E `compact-app.spec.ts`。

> 具體保留／刪除以模式判準逐案裁定；上列為方向性分類，非窮舉。

## 與 035 的關係（排序與交界）

**排序（使用者裁示）**：025 先跑，035 後跑。兩者目前都尚未開跑。流程為 **025 rebase 到最新 `master` → 做完 025 → 035 再 rebase 到含 025 的 `master` 上執行**。理由：035 會刪檔／搬檔／改寫多支測試並導入 knip，讓 025 先在乾淨的 master 上做完純測試層清理，035 隨後 rebase 一次吸收，比反向少一輪衝突。

025 先跑不需「閃避」035（035 還沒動任何檔），但為免做白工，交界處這樣拿捏：

- **035 之後會整支刪除的測試，025 不去精修**：`format-published-date.test.ts`、`migrate-content-slug.test.ts`、`localize-content-images.test.ts`——這些本就不是 source-grep 反模式（是 util／migration 的行為測試），本來就不在 025 scope，維持不碰即可。
- **035 之後會刪除的元件，025 只拔脆弱斷言、不改寫成 render 測試**：若 adoption／smoke 測試中有針對 `TagExplorer` 等 035 將移除元件的字串斷言，025 直接移除該斷言即可，不要投入成本改寫成 `@vue/test-utils` render 測試（改寫完 035 又刪掉＝白工）。
- **back-navigation／破圖 fallback 的行為斷言留給 035 收斂**：035 AC7/AC8 會把這兩者收斂成單一 composable 並在 composable 層測一份。025 在 `product-detail-back-navigation.test.ts` / `guide-detail-back-navigation.test.ts` 只處理 **CSS 數值 grep（A 類）**，不動其行為斷言，避免與 035 的 composable 化改寫對撞。
- **knip（035 AC12）的加乘**：035 導入 knip 後，若 025 的刪測試留下任何 unused export／file，會在 035 階段被 knip 一併照出補刀。

## ADR

- **ADR-025-1：source-grep 測試一律視為反模式。** 測試斷言行為（輸入→輸出、render DOM、讀 resolved 設定值），不斷言原始碼字面。視覺回歸交給 E2E 截圖或人眼，不用字串比對。
- **ADR-025-2：覆寫 CLAUDE.md「禁止刪除已存在的測試案例」。** 該規則原意是防止實作時為省事砍測試；本 sprint 是經使用者明確授權的測試品質清理，刪除「無行為價值」測項屬合理範圍。刪除前須確認其行為若仍有價值，已有等價覆蓋（AC7）。
- **ADR-025-3：釘死真實 `content/` 資料值＝反模式。** 內容資料會被編輯自由增修，測試不應對其實際筆數／實際 slug 做斷言；要固定筆數就用合成 fixture，要驗性質就測不變式（published 收錄、draft 缺席）。

## Milestones

- [x] **M1：刪 CSS 數值斷言** — A 類整批清除，保留 token 存在與對比度。（AC1）
- [x] **M2：grep 原始碼文字／順序／文件斷言** — B 類清除，行為價值者轉 render。（AC2、AC7）
- [x] **M3：config/CI 字串改讀值或刪** — C 類處理，保留合理讀值與 hook 行為斷言。（AC3）
- [x] **M4：adoption 測試行為化** — D 類，行為價值者改 render/E2E，純文字者刪。（AC4、AC7）
- [x] **M5：釘死 content 資料值清理** — E 類，改對 fixture 或測不變式。（AC5、AC7）＋盤點時發現的 C/B 類 residual straggler 一併清理。
- [x] **M6：收尾** — 全套件 `pnpm test`/`lint`/`typecheck`/`./dev.sh verify` 綠，更新 `works.md`。（AC6）

> M1+M2 合併於一次派工（A/B 類在 `nuxt-smoke.test.ts` 同 `it` 交錯，拆開會半殘再重開）。處理檔：`nuxt-smoke`、`product-detail-back-navigation`（僅 CSS 段）、`view-transition`、`fetch-detail-helpers`。
>
> 交棒 035 的已知殘留：`product-detail-back-navigation.test.ts` 的 `it #1`（`onBackClicked` 的 same-origin/fallback 邏輯）目前仍是 source-grep，**刻意留給 035**——035 AC7 會把 back-navigation 抽成 composable 並在 composable 層測一份，屆時取代此 grep 版；025 先留作過渡覆蓋，避免 025→035 之間掉 back-nav 覆蓋。
>
> defer 至各自 milestone：`nuxt-ui-*-adoption`（含其 CSS 行）整支留 M4；`nuxt-smoke` 的 generate/build script 與 package deps 斷言留 M3；`nuxt-smoke` 的真實 content taxonomy／published count 斷言留 M5。

> 註：原草稿末的「022 review 修正未 commit」註記已過期（022 早已合併），移除。
