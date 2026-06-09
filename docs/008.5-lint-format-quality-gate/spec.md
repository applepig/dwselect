# Lint / Format Quality Gate

## 目標

為 dwselect 補上目前完全缺席的程式碼品質基礎建設，使「lint + format + typecheck」成為可一鍵執行、且 CI／hook 可依賴的綠燈門檻：

- ESLint flat config，涵蓋 TypeScript、Vue、Nuxt auto-import globals、Vitest globals。
- 以 ESLint 原生 `@stylistic` 做格式化（取代 Prettier），對齊現有風格：single quote、no semicolon、2-space indent、trailing comma multiline。
- 移植 `nuxt-ui-v4-compat` ESLint plugin，攔截 @nuxt/ui v3 殘留／deprecated API。
- 提供 `pnpm lint` / `pnpm lint:file` / `pnpm format` / `pnpm typecheck` scripts。
- 將既有 codebase 收斂到 `pnpm lint` 全綠。
- agent-side quality gate：OpenCode / Codex / Claude 三家都要在編輯後自動對該檔跑 fail-open `lint:file`；OpenCode 走 formatter，Codex / Claude 走 hook。

## 非目標

- **不導入 Prettier**：format 由 ESLint `@stylistic` 負責（符合全域 CLAUDE.md「Lint/Format 用 ESLint」）。
- **不做 Docker 化**：屬下一個獨立 sprint；本 sprint 的 lint hook 一律 host 側執行，不耦合 container。
- **不建 CI pipeline**：本 sprint 只到「本機可一鍵綠燈 + post-edit hook」；GitHub Actions 等 CI 接線另議。
- **不做功能性重構**：除了 `eslint --fix` 的格式化變更與必要的 lint 修正，不順手改架構、命名或邏輯。
- **不救** `~/.local/share/Trash` 的舊版 `validate-nuxt-quality.sh`（container-coupled、已淘汰）。

## User Story

作為 dwselect 的維護者（人類 + AI agent），我想要一套一鍵可跑、且編輯後自動套用的 lint/format 門檻，以便程式碼風格一致、deprecated API 在進 commit 前就被攔下，並讓未來的 Docker／CI 有可靠的品質 gate 可接。

### 驗收條件

- [ ] 專案根存在 `eslint.config.mjs`（flat config），`pnpm exec eslint .` 可執行且無設定錯誤。
- [ ] `package.json` 具備 direct devDependencies：`eslint >= 9`、`@nuxt/eslint`、`typescript`、`vue-tsc`；不可依賴 transitive ESLint（目前 `pnpm exec eslint --version` 會解析到 legacy `v6.4.0`）。
- [ ] `package.json` 具備 scripts：`prepare`（`nuxt prepare`，確保 fresh checkout 產生 `.nuxt` types/config）、`lint`（檢查全專案）、`lint:file`（`eslint --fix --max-warnings=0` 單檔）、`format`（`eslint --fix` 全專案）、`typecheck`（固定 `nuxt typecheck`，不直接用 `vue-tsc --noEmit`）。
- [ ] `@stylistic` 規則生效且對齊現有風格：single quote、no semicolon、2-space indent、trailing comma multiline；對既有檔案跑 `--fix` 後不產生與現狀相反的排版。
- [ ] `nuxt-ui-v4-compat` plugin 已接入 config，對 `.vue` 檔生效；**8 條規則每一條**都有 deliberate deprecated fixture 樣本、斷言會 fire（如 `<USelect :options="...">` 報 error）。
- [ ] 「生效」以 fixture fire 為準：因實際 `app/` 已 v4-clean（掃描無 `:options`/`UFormGroup`/舊色彩值/`items` 內 `click:`），對實際 code 跑得到的「零命中」無法區分「plugin 生效」與「plugin 沒接上」，故必須有 fixture 正反案例證明。對實際 `app/` 跑一次並記錄 baseline（預期 0 命中）。
- [ ] `pnpm lint` 對整個既有 codebase exit 0（綠燈）。
- [ ] `pnpm test` 在格式化後仍全綠（formatting 未破壞行為）。
- [ ] 編輯任一 `.vue/.ts/.js/.mjs` 後，三個 agent host 都會自動對該檔跑 fail-open `lint:file`：OpenCode 透過 `formatter` custom command 與 `$FILE`，Codex 透過 repo-local `.codex/hooks.json` `PostToolUse` hook，Claude 透過 `.claude/settings.json` `PostToolUse` hook。
- [ ] 非 lintable 檔或 lint 失敗都不中斷編輯流程（fail-open）；skip 是否輸出訊息需在 CLI 契約中固定，lint 失敗訊息進 stderr。
- [ ] 上述每條對映到 `tests/` 中的契約測試（見 Milestones）。

## 相關檔案

- `eslint.config.mjs` — 新增，ESLint flat config 入口。
- `eslint-plugins/nuxt-ui-v4-compat.mjs` — 從 v6-novel-as-code 移植（523 行，純 rule module）。
- `package.json` — 新增 scripts 與 devDependencies。
- `AGENTS.md` — 更新 Commands 區，移除「目前沒有 lint/typecheck/format scripts」的舊指示，改列新 quality gate 指令。
- `scripts/post-edit-hook.sh` — 新增，改寫自 v6 的 post-edit-hook.sh（單一 app 版、host 側），作為三個 agent host 共用的 fail-open runner。
- `opencode.json`（或 `.opencode/opencode.json`） — 新增 OpenCode formatter 設定；custom formatter command 指向上述 script 並使用 `$FILE` placeholder。
- `.codex/hooks.json`（或 `.codex/config.toml`） — 新增 Codex `PostToolUse` hook adapter；解析 stdin JSON 的 `apply_patch` / `Edit` / `Write` 事件並呼叫上述 script。
- `.claude/settings.json`（或 `settings.local.json`） — 新增 Claude `PostToolUse` hook adapter；解析 tool payload 的編輯檔案路徑並呼叫上述 script。
- `tests/lint-config.test.ts` — 新增，lint 設定與 scripts 的契約測試。
- `tests/eslint-nuxt-ui-compat.test.ts` — 新增，對 fixture 跑 plugin 規則的行為測試。
- 既有 `app/`、`tests/`、`scripts/`、`nuxt.config.ts` 等 — 會被 `--fix` 套用格式化。

## 介面/資料結構

通訊協定：N/A（本 sprint 為建置工具，無 runtime API）。

**post-edit 共用 runner 介面（CLI 契約）：**

```
scripts/post-edit-hook.sh <absolute_file_path>
  一律 exit 0（fail-open），分三種情況：
    - skip：非 lintable 副檔名或檔案不存在 → exit 0，不輸出訊息
    - fixed：lintable 檔 → 跑 `lint:file` 嘗試 --fix
    - failed：lint 仍有錯 → 訊息進 stderr，但仍 exit 0（不阻斷編輯）
  stderr = 僅 failed 時輸出結構化檢查訊息
```

**agent host adapter 契約：**

- OpenCode：專案層 config 必須啟用 `formatter` object，不啟用 Prettier；新增 custom formatter，`extensions` 至少涵蓋 `.vue`、`.ts`、`.js`、`.mjs`，`command` 使用 `scripts/post-edit-hook.sh` 與 `$FILE` placeholder。
- Codex：repo-local `.codex/hooks.json` 或 `.codex/config.toml` 必須設定 `PostToolUse`，matcher 涵蓋 `apply_patch`、`Edit`、`Write`；hook command 從 stdin JSON 解析被編輯檔案，逐檔呼叫 `scripts/post-edit-hook.sh`。Codex hook 需要經 `/hooks` trust；文件需註明信任流程與 `--dangerously-bypass-hook-trust` 只允許自動化驗證使用。
- Claude：repo-local `.claude/settings.json` 必須設定 `PostToolUse`，matcher 涵蓋 `Edit`、`MultiEdit`、`Write`；hook command 從 tool payload 解析被編輯檔案，逐檔呼叫 `scripts/post-edit-hook.sh`。

> 註：採 fail-open（任何情況都 exit 0），避免 hook 阻斷 agent 的編輯流程；真正的綠燈門檻由 `pnpm lint` 在 commit 前把關。

## 邊界案例

- **Generated / 非原始碼**：`.nuxt/`、`.output/`、`.nitro/`、`node_modules/`、`public/search-index.json`、`content/**/*.json`、`test-results/`、`playwright-report/` 必須在 config `ignores`，不被 lint。
- **單詞檔名**：Nuxt pages/layouts 慣例 `index.vue`、`default.vue` → 關閉 `vue/multi-word-component-names`。
- **底線前綴未使用變數**：`argsIgnorePattern: '^_'` 等，允許 `_unused`。
- **post-edit hook 對非 lintable 檔**（`.md`、`.css`、`.json`）→ 直接 exit 0，且不輸出訊息。
- **post-edit hook 在 lint 報錯時** → fail-open exit 0，不可中斷編輯。
- **既有碼有無法 `--fix` 自動修的 error**（如真正的未使用 import、`no-undef`）→ 本 sprint 內手動修到綠，屬驗收範圍。
- **fresh checkout**：`pnpm install --frozen-lockfile` 後未手動跑 dev server 時，`pnpm lint` / `pnpm typecheck` 仍必須可執行；用 `prepare: nuxt prepare` 產生 `.nuxt` types/config，避免依賴本機殘留。
- **`@stylistic` 與既有風格衝突**：以現有風格為準設定規則；若 `--fix` 後大量改動，確認是「統一既有不一致處」而非「翻轉風格」。

## ADR

### ADR-1：採 `@nuxt/eslint` module 產生 base config，而非手抄 v6 的 globals 清單

- **決策**：用官方 `@nuxt/eslint` module（`features.stylistic` 開啟）產生 Nuxt-aware 的 flat config 基底，再 extend 自訂規則與 `nuxt-ui-v4-compat` plugin。
- **原因**：v6 的 `eslint.config.mjs` 手列了 100+ 個 Nuxt/Vue auto-import globals 才能避免 `no-undef` 誤報；`@nuxt/eslint` 會依專案實際 auto-imports 自動產生，免維護、不漏。且它原生整合 `@stylistic`，一處設定即涵蓋 format。
- **替代方案**：手抄 v6 flat config（hand-rolled globals）。排除原因：v6 是 monorepo 的歷史產物，手維護 globals 清單在單一 app 上是不必要負擔，且容易隨 Nuxt 版本漂移。
- **保留**：`nuxt-ui-v4-compat` plugin 與兩者皆相容，照移植。

### ADR-2：format 用 `@stylistic` 而非 Prettier

- **決策**：格式化交給 ESLint `@stylistic`（經 `@nuxt/eslint` 的 `features.stylistic` 設定）。
- **原因**：符合專案既有慣例（CLAUDE.md：ESLint，不用 Prettier）；單一工具、單一 `--fix` 流程、不需處理 ESLint/Prettier 規則衝突。
- **替代方案**：Prettier 專責排版。排除原因：與既有慣例不符，且引入雙工具協調成本。

### ADR-3：agent-side quality gate 採 fail-open、host 側執行

- **決策**：OpenCode / Codex / Claude 各自用 host 支援的 extension point 接到同一個 fail-open runner；OpenCode 用 formatter，Codex / Claude 用 post-edit hook。runner 對編輯檔跑 `lint:file`，但無論結果都回 exit 0；在 host 側直接跑 `pnpm`，不經 container。
- **原因**：避免 lint 失敗阻斷 agent 編輯（v6 同款設計）；Docker 尚未導入，host 側最簡單，等 Docker sprint 再評估是否改 container 內執行。三家 agent 都會改檔，品質 gate 不能只對 Claude 生效。
- **替代方案**：fail-closed（lint 失敗即擋）。排除原因：會讓 agent 卡在半完成的編輯；綠燈門檻改由 `pnpm lint`／commit 前把關更恰當。

## Milestones

### Milestone 1: ESLint flat config + @stylistic + scripts
> 範圍：`eslint.config.mjs`、`package.json`（direct devDeps + scripts）、`AGENTS.md` Commands 區、`@nuxt/eslint` 接入、`tests/lint-config.test.ts`
> 驗證：`pnpm exec eslint --version` 顯示 ESLint 9；`pnpm exec eslint --print-config app/app.vue` 不報設定錯誤；`tests/lint-config.test.ts` 斷言 scripts、direct devDeps、config 存在、@stylistic 風格選項正確；`pnpm typecheck` 可執行
> 預期結果：lint/format/typecheck 指令可跑（此時尚未要求既有碼全綠）

- [x] Red → Green → Refactor

### Milestone 2: 移植 nuxt-ui-v4-compat plugin
> 範圍：`eslint-plugins/nuxt-ui-v4-compat.mjs`（自 v6 移植）、config 接線、`tests/eslint-nuxt-ui-compat.test.ts`
> 驗證：對含 deprecated 用法的 fixture 跑 ESLint，斷言 8 條規則各自報出對應 error、對正確用法不報（這是「plugin 確實生效」的唯一可靠證明，因實際 code 已 v4-clean）；另對實際 `app/` 跑一次記錄 baseline（預期 0 命中），確認 plugin 在執行而非靜默 no-op
> 預期結果：8 條 compat 規則對 `.vue` 生效，作為防止 v3 寫法回流的 regression guard

- [x] Red → Green → Refactor

### Milestone 3: 既有 codebase 收斂到綠
> 範圍：對全 repo 跑 `eslint --fix`，手動修剩餘 error；可能涉及 `app/`、`tests/`、`scripts/`、`nuxt.config.ts` 等大量檔案的格式化變更
> 驗證：`pnpm lint` exit 0；`pnpm test` 13 files 全綠（確認格式化未改壞行為）；`pnpm generate` 仍成功
> 預期結果：綠燈門檻成立，格式化 diff 與功能修正分開、可獨立 review

- [x] Red → Green → Refactor

### Milestone 4: agent-side quality gate adapters
> 範圍：`scripts/post-edit-hook.sh`（改寫自 v6）、OpenCode formatter config、Codex PostToolUse hook config、Claude PostToolUse hook config、`tests/post-edit-hook.test.ts`（或 bats 風格的 shell 測試）、`tests/agent-quality-gate-config.test.ts`
> 驗證：餵不存在檔／非 lintable 副檔名 → exit 0 且無輸出；餵一個有可自動修錯的 `.ts` → 檔案被修正；lint 仍失敗時 → exit 0（fail-open）且 stderr 有訊息；OpenCode config 驗證 formatter extensions / `$FILE` command；Codex config 驗證 `PostToolUse` matcher 與 stdin adapter；Claude config 驗證 `PostToolUse` matcher 與 payload adapter。
> 預期結果：OpenCode / Codex / Claude 編輯後都會自動 lint:file，且不阻斷編輯流程

- [x] Red → Green → Refactor

## 版本與 Branch

- 編號 `008.5`：插在 008（進行中）與 009（未動工）之間的 tech-debt sprint，採 `.5` 子編號慣例。
- Branch `feat/008.5-lint-format-quality-gate` stack 在 `feat/008` HEAD 之上（`main` 仍為改 Nuxt 前的舊 SPA、距今 20 commits，不作 base）。
