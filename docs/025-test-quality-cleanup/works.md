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
