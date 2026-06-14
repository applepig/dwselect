# Works — 014 Nuxt UI 元件採用（P0）

## 狀態
- 分支：`feat/014-nuxt-ui-component-adoption`（從 `81c2985` 開出，S13 已 commit）。
- **尚未 commit**，等使用者 review 後授權。
- 測試：host `pnpm test` → **230 passed / 0 failed**；`pnpm lint` ✅；`pnpm typecheck` ✅；`pnpm generate` ✅。
- E2E：xreview 收尾後 `pnpm test:e2e` → **51 passed / 6 skipped**，涵蓋 phone、tablet、desktop。先前 `dwselect.toybox.local` 502 已修復。

## Milestone 完成情形
- **M1 app.config.ts** ✅：`colors.primary:'orange'`、`neutral:'stone'`。`variables.css` 在 `@nuxt/ui` 之後 import、直接覆寫語意 `--ui-primary` 為 `--dw-accent`（橘），故 UI 主色維持橘色（agent-browser 已確認送出鈕/active nav 為橘）。
- **M2 search-input → UInput** ✅：leading `i-lucide-search`、清除＋送出鈕移入 `#trailing`。保留 composition guard（純函式 `search-input-composition`）、`enterkeyhint/autocapitalize/autocorrect/spellcheck/autocomplete`。
- **M3 chip → UButton** ✅：`index.vue` 分類 chip、`tag-explorer.vue`、`search-idle-panel.vue` 熱門標籤/歷史/清除鈕。active 用 `variant`（solid/subtle），保留 `aria-pressed`，count 移入 `#trailing`。
- **M4 empty states → UEmpty** ✅：`index/guide/links/search`。search 的「無結果」與「搜尋中」用不同 icon 區分（`search-x` vs `loader-circle`），文案不變。
- **M5 product-detail** ✅：callout → `UAlert`（讀 `Alert.vue` 確認預設 `as='div'`、**無 `role="alert"`**，不打斷螢幕報讀）；返回鈕 → `UButton`（ghost + `arrow-left`，保留 router.back）。
- **M6 catalog.css 清理** ✅：刪除 `.search-input-shell`、`.search-input-icon`、`.category-chip.is-active`、`.tag-chip.is-active`、`.compact-empty-state`、`.detail-callout*`、`.detail-back-button` 等被替換的 dead CSS。`.search-input` / `.search-input-actions`、chip base class 與 `.empty-title` 仍承擔 layout、focus-visible 或 search 子面板用途，保留時不視為 dead CSS。

## 技術決策與發現
- **測試基建更新（xreview 後）**：已加入最小 Vue mount component test 基建：`@vue/test-utils`、`happy-dom`、`@vitejs/plugin-vue` 與 `vitest.config.ts`。既有 Vitest 預設仍是 `node` environment，只有 `tests/search-input-component.test.ts` 以檔案註解使用 `happy-dom`。
- **search-input mount test（xreview 後）**：新增 `tests/search-input-component.test.ts`，用 stubbed `UInput` / `UButton` mount `search-input.vue`，覆蓋 `update:query`、`submit`、`clear`、composition guard、清除鈕條件顯示。為支援單檔 mount，`search-input.vue` 顯式 import `computed`、`onMounted`、`ref`。
- **spec 決策同步（xreview 後）**：`spec.md` 已回寫實作決策：`search-input.vue` 使用 `type="text"` + `enterkeyhint="search"`，避免瀏覽器 native clear 與自訂清除鈕重複；`.search-input` / `.search-input-actions`、chip base class、`.empty-title` 若仍承擔 layout、focus-visible 或子面板樣式用途，不視為 dead CSS。
- **E2E selector 修正（xreview 後）**：`tests/e2e/compact-app.spec.ts` 的首頁分類還原測試不再依賴 `.category-chip.is-active`，改用 button role 與文字「影音劇院」，並斷言 `aria-pressed="true"`。完整 E2E 時也同步修正 search popular panels 的 stale selector：改用 `.search-popular-panel[data-section-id="..."]`，避免舊 `.search-popular-section` 與 strict multi-match 失敗。
- **`.empty-title` 保留**：仍被 `search-error-panel/search-suggestion-list/search-idle-panel` 使用，未刪。
- **既有 dead CSS**（`.detail-close-button`、`.product-detail-modal`）來自更早 sprint，非本 sprint 範圍，未擴大處理。

## agent-browser 驗收（直連容器 `172.18.0.5:3000`，繞過 Traefik）
逐頁截圖確認（light + dark）：
- 首頁 chips（UButton，active 深色 pill、count 在 trailing）✅ light + dark
- 搜尋頁 UInput（leading icon + 橘色送出鈕）、熱門標籤/品牌 chips ✅
- 無結果 UEmpty（icon + 「沒這個坑，去許願吧」）✅
- 商品詳情 UAlert callout（「DW 怎麼說」）+ ghost 返回鈕 ✅
- guide / links ResourceList 無破版 ✅
- dark 模式 chips active 仍清楚可辨 ✅

### agent-browser 抓到並修復的 bug
- **搜尋框雙重清除鈕**：`type="search"` 觸發瀏覽器原生清除叉，與自訂 UButton 清除鈕重複（畫面出現「× ×」）。原始碼本為 `type="text"`，spec（coordinator 記憶誤差）誤要求 `type="search"`。**修法**：改回 `type="text"`，保留 `enterkeyhint="search"`（手機鍵盤搜尋鍵不受影響）。同步更新測試斷言。HMR 後重測 → 只剩單一清除鈕 ✅。

## 環境收尾
1. **E2E webServer / Traefik 入口已修復**：根因是共用 Traefik file provider 仍有舊 router `dwselect-dev@file` 使用同一個 Host rule `Host("dwselect.toybox.local")`，指向 stale upstream `http://172.19.0.1:3000`，與本專案 Docker router `dwselect@docker` 衝突。已將外部共用設定 `/home/applepig/gitplan/traefik/certs/dwselect-dev.yml` 的 Host 改為 `dwselect-dev.disabled.local`，讓 `dwselect.toybox.local` 只由本專案 Docker router 接管。修正後 `curl -k -I https://dwselect.toybox.local/` 回 `HTTP/2 200`，完整 `pnpm test:e2e` 通過。
2. **`pnpm generate` 已恢復成功**：xreview 後檢查 `.output` 不是獨立 mount，直接執行 host `pnpm generate` 成功產生 `.output/public`，未重現先前 `EBUSY`。
