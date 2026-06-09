# 008.5 Lint / Format Quality Gate Works

## 2026-06-09

### 完成範圍

- Milestone 1：新增 ESLint 9 flat config、`@nuxt/eslint` module 接入、`@stylistic` 格式規則、`prepare`／`lint`／`lint:file`／`format`／`typecheck` scripts，並更新 `AGENTS.md` Commands。
- Milestone 2：移植 `/home/applepig/Dropbox/projects/v6-novel-as-code/eslint-plugins/nuxt-ui-v4-compat.mjs`，接入 `.vue` lint config；新增 8 條 deprecated fixture fire 測試、正案例測試與 app baseline 0 compat finding 測試。
- Milestone 3：以 `pnpm format` 收斂既有 codebase，手動修正 typecheck gate 啟用後暴露的最小型別問題；移除 `published-products.ts` 內兩個既有 unused helper。
- Milestone 4：新增 fail-open `scripts/post-edit-hook.sh`、OpenCode formatter config、Codex `PostToolUse` hook config、Claude `PostToolUse` hook config，並以契約測試覆蓋 skip／auto-fix／fail-open stderr。

### 技術決策

- Root `eslint.config.mjs` 使用 `.nuxt/eslint.config.mjs` 作 Nuxt-aware base；fresh checkout 透過 `prepare: nuxt prepare` 產生 `.nuxt` config 與 types。
- Format 採 ESLint `@stylistic`，並明確固定 single quote、no semicolon、2-space indent、trailing comma multiline；為符合現有程式風格，`arrow-parens` 設為 `always`。
- `docs/design_handoff_dwselect_redesign/**` 是舊設計交付稿，不納入 source lint；`content/**/*.json`、`public/search-index.json`、generated output 也維持 ignore。
- `post-edit-hook.sh` 對不存在檔與非 lintable 副檔名靜默 exit 0；lint 失敗時仍 exit 0，stderr 輸出 `[post-edit-hook] {"status":"failed",...}` 與 ESLint 診斷。
- `nuxt typecheck` 需要 root `tsconfig.json`，因此新增最小 `tsconfig.json` extends `.nuxt/tsconfig.json`，並啟用 `allowImportingTsExtensions` 以支援目前 Node 直接執行 `.ts` build script 的 import 形態。
- Codex hook 需要使用者在 `/hooks` 信任 repo-local hook；`--dangerously-bypass-hook-trust` 只適合自動化驗證使用。

### Red / Green 紀錄

- Red：新增 `tests/lint-config.test.ts`、`tests/eslint-nuxt-ui-compat.test.ts`、`tests/post-edit-hook.test.ts`、`tests/agent-quality-gate-config.test.ts` 後，測試因缺少 direct ESLint dep、config、plugin、runner 與 agent configs 失敗。
- Green：安裝 direct deps、移植 plugin、補 config／runner／agent adapters 後，新增契約測試 21 案例通過。
- Refactor／收斂：調整 lint source 範圍與既有風格規則，跑 `pnpm format`，再修正 unused helper、route query null array、Zod direct import、Node type definitions 與 root tsconfig。

### 驗證結果

- `pnpm exec eslint --version`：v9.39.4。
- `pnpm exec eslint --print-config app/app.vue`：成功，輸出 3121 lines。
- `pnpm test`：17 files，147 tests passed。
- `pnpm lint`：passed。
- `pnpm typecheck`：passed。
- `pnpm generate`：passed，search index documents 67，prerendered 140 routes；僅有 sourcemap／Rollup PURE annotation warnings。
- `node scripts/assert-runtime-google-sheet-clean.ts`：passed。

### Xreview Issue #2 修正

- Red：新增 `tests/eslint-nuxt-ui-compat.test.ts` negative fixture，確認非 items domain object `{ label: 'hero cta', click: 1 }` 會被 `nuxt-ui-v4-compat/no-deprecated-click-in-items` 誤報而失敗。
- Green：將 `no-deprecated-click-in-items` 的 script/template object 掃描收斂到明確 `items`／`actions` context，保留 `const items = [{ label: 'Open', click: () => {} }]` deprecated fixture 報錯。
- 驗證：`pnpm test tests/eslint-nuxt-ui-compat.test.ts` passed，11 tests passed；`pnpm lint` passed。

### 風險與後續

- `pnpm generate` 會重建 `public/search-index.json`；本次 diff 只有 build output 更新。
- `pnpm add` 顯示 `unrs-resolver`、`vue-demi` build scripts 被 pnpm 忽略，未影響本次 test／lint／typecheck／generate。
- 尚未 commit，需使用者確認後再依 Conventional Commits 提交。
