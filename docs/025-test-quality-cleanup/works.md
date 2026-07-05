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
