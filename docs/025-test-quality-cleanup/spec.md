# 025 測試品質清理（Test Quality Cleanup）

> 狀態：草稿，待使用者確認
> 建立日期：2026-06-21
> 分支：`025-test-quality-cleanup`（自 `022-content-dev-hmr` HEAD 開出，含 022 review 修正未 commit 的改動）

## 背景

測試套件累積了大量「把原始碼當純文字 grep」的測項——讀 `.vue` / `.css` / `.ts` / `package.json` / CI YAML / `README.md` / `AGENTS.md`，斷言 `toContain('某段字串')`。這些斷言的是「實作長什麼樣」而非「行為對不對」，導致：

- 任何無害的改名、格式化、視覺微調都會誤紅（false positive）。
- 動一點 production code 就要連帶改一堆測試（如 022 的 breadcrumb 改名、`scripts.dev` 改動）。
- 真正測行為的測項被大量低價值字串斷言稀釋，review 噪音高。

具體症狀：`tests/dev-server-script.test.ts:9`（`scripts.dev === 'nuxt dev'`）在 `scripts.dev` 合理改成帶 container 守衛後**目前正紅**。

## 目標

1. 移除「斷言實作文字／寫死 CSS 數值／寫死 config 字串」這類脆弱、無行為價值的測項。
2. 把有行為價值但用 source-grep 實作的測項，改寫成 render DOM / 讀值斷言的真行為測試。
3. 修掉現存因 config 變動而誤紅的 `dev-server-script` 測項。
4. 測試套件回到全綠，且行為覆蓋不退步。

## 非目標

- 不新增功能、不改 production 行為（純測試層整理；唯一 production 觸碰是必要時為了可測性的最小調整，需另行記錄）。
- 不動「行為型」好測試（見下方保留清單）。
- 不重寫 E2E 策略、不導入新測試框架。

## 驗收條件

- AC1：`tests/dev-server-script.test.ts` 不再有寫死 `scripts.dev` 字串的斷言；該檔全綠。
- AC2：CSS 數值字串斷言（exact `padding` / `block-size` / `grid-template-columns` / `--detail-back-inset` 等）全數移除；保留「class / token 存在」與對比度（`getContrastRatio`）類行為斷言。
- AC3：「斷言原始碼文字內容／token 順序／文件用字」類測項移除（含一支測試去 grep 另一支測試原始碼的 `nuxt-smoke.test.ts:76-84`）。
- AC4：寫死 config / CI YAML 字串的測項移除或改為讀值斷言（保留 `dev-server-script.ts:13-21` 這種讀 `nuxt.config` 實際值的合理斷言）。
- AC5：兩支 adoption 測試（`nuxt-ui-component-adoption`、`nuxt-ui-empty-and-callout-adoption`）中具行為價值者（IME 不誤送、有 query 才顯示 clear 鈕、空狀態渲染）改寫成 `@vue/test-utils` render／既有 E2E 涵蓋；純文字斷言移除。
- AC6：`pnpm test`、`pnpm lint`、`pnpm typecheck` 全綠。
- AC7：行為覆蓋不退步——刪除的測項若仍有行為價值，須在 unit render 或 E2E 有對應覆蓋。

## 範圍盤點（依不合理程度排序）

### A. 寫死 CSS 數值（純視覺、零行為）→ 刪除
- `tests/nuxt-smoke.test.ts:264-334`、`573-609`
- `tests/product-detail-back-navigation.test.ts:25-44`
- `tests/view-transition.test.ts:30-45`
- 保留：`nuxt-smoke.test.ts:608` 的 `getContrastRatio` 對比度斷言。

### B. 斷言原始碼文字／順序／文件用字 → 刪除（必要者轉行為測試）
- `tests/nuxt-smoke.test.ts:76-84`（grep 另一支測試原始碼）
- `tests/nuxt-smoke.test.ts:543-567`、`299-300`、`449`（indexOf 比 source token 順序）
- `tests/nuxt-smoke.test.ts:684-691`、`92-115`（README / AGENTS / docs 文字）

### C. 寫死 config / CI 字串 → 刪除或改讀值
- `tests/dev-server-script.test.ts:9`（正紅）
- `tests/nuxt-smoke.test.ts:25-26`（整段 generate/build script 字串）
- `tests/static-generate-workflow.test.ts:11-71`（逐行 grep CI YAML）
- `tests/app-config.test.ts`、`tests/lint-config.test.ts`、`tests/agent-quality-gate-config.test.ts`、`tests/post-edit-hook.test.ts`（grep config / hook 文字）
- 保留：`dev-server-script.ts:13-21`（讀 `nuxt.config` 實際 `allowedHosts` 值）；`post-edit-hook.test.ts` 中實際執行 hook 跑 ESLint 的行為測項（`31-66`）屬真行為，保留。

### D. adoption 測試 → 行為價值者改寫，純文字者刪
- `tests/nuxt-ui-component-adoption.test.ts`（17 it）
- `tests/nuxt-ui-empty-and-callout-adoption.test.ts`（10 it）

### 保留（行為型好測試，不動）
`client-search.test.ts`、`compare-*`、`map-*`、`search-index.test.ts`、`product-schema.test.ts`、`parse-content-markdown`、`build-navigation.test.ts`、`server-content-routes.test.ts`、E2E `compact-app.spec.ts`。

## ADR

- **ADR-025-1：source-grep 測試一律視為反模式。** 測試斷言行為（輸入→輸出、render DOM、讀設定值），不斷言原始碼字面。視覺回歸交給 E2E 截圖或人眼，不用字串比對。
- **ADR-025-2：覆寫 CLAUDE.md「禁止刪除已存在的測試案例」。** 該規則原意是防止實作時為省事砍測試；本 sprint 是經使用者明確授權的測試品質清理，刪除「無行為價值」測項屬合理範圍。刪除前須確認其行為若仍有價值，已有等價覆蓋（AC7）。

## Milestones

- **M1：止血既有紅燈** — 移除/改寫 `dev-server-script.test.ts` 寫死 `scripts.dev` 字串，套件回綠。（AC1）
- **M2：刪 CSS 數值斷言** — A 類整批清除，保留 token 存在與對比度。（AC2）
- **M3：刪原始碼文字／順序／文件斷言** — B 類清除。（AC3）
- **M4：config/CI 字串改讀值或刪** — C 類處理，保留合理讀值斷言。（AC4）
- **M5：adoption 測試行為化** — D 類，行為價值者改 render/E2E，純文字者刪。（AC5、AC7）
- **M6：收尾** — 全套件 `pnpm test`/`lint`/`typecheck` 綠，更新 `works.md`。（AC6）

> 註：022 的 review 修正（build-navigation、client-search、breadcrumb 三項 + 測試）目前隨此分支攜帶、尚未 commit，與本 sprint 無關，commit 策略待使用者決定。
