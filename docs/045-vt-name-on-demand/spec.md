# 045 View Transition name 按需掛載

> 承接 038 m3c 提案 3（當時裁決延後）。使用者回報換頁慢；Playwright headless 對正式站實測：首頁 → 詳情 DOM 切換
> 現況約 4.5s、只保留 root name 約 0.35s、關動畫但保留 name 仍 3.4s——成本在「每次換頁要為 475 個
> `view-transition-name`（77 卡 × 6 part ＋ root）各拍快照」，不在動畫時長。量測腳本與方法見 works.md。

## 目標

列表頁靜止時不掛商品 `view-transition-name`；只有「使用者正要進／剛從詳情頁回來」的那一個商品帶 name，
card ↔ detail 的 morph 行為維持不變。

## 非目標

- 不改動畫語彙、時長、delay、CSS keyframes；不改 `ENABLE_VIEW_TRANSITION` flag 與 Vue fallback 機制。
- 已接受的行為變更：列表 ↔ 列表（分類切換）時，卡片不再逐張 morph 滑動，改隨 root fade——那正是被省下的 475 份快照成本。
- 不做「效果不佳就退回 Vue transition」的決策——那是本 sprint 量測後由使用者裁決的 Plan B，另開。

## 驗收條件

- [x] AC1：首次載入任一列表頁（`/`、`/category/*`、`/tag/*`、`/brand/*`、`/channel/*`、`/search` 結果）後，DOM 中帶商品 `view-transition-name` 的元素數為 0（root 除外）。
- [x] AC2：以滑鼠點擊或鍵盤 Enter 啟用某張卡片進詳情時，在 View Transition 拍 old 快照前，該卡 6 個 part 已帶與詳情頁相同的 name；其他卡片仍無 name。
- [x] AC3：從詳情頁返回列表（返回鈕、瀏覽器 back、或點側欄／chip 進任一含該商品的列表）時，該商品卡片在 new 快照時帶 name，反向 morph 保留；同一時間帶 name 的商品仍恰好一個。
- [x] AC4：詳情頁自身的 name 行為不變；`prefers-reduced-motion: reduce` 下既有停用規則不變。
- [x] AC5：`tests/view-transition.test.ts` 中「card 與 detail 共享 name」的既有測試改為在「該卡為 active 商品」狀態下驗證；新增「非 active 卡片無 name」與「啟用後才有 name」的 mount 級行為測試。不新增讀 source 的字串斷言。
- [ ] AC6（量測，works.md 記錄）：對 `pnpm generate` 產物或部署後正式站，以 works.md 的 Playwright 腳本量首頁 → 詳情 DOM 切換時間，中位數落在「只保留 root」情境的同一個量級（現況 4.5s → 目標 < 0.6s，headless 軟體 raster 環境下的相對值）。
  - 未達標：本機 generate 產物量到中位數 614ms，超過 `< 0.6s` 門檻 14ms（works.md M2）。改動前的 4519ms 基線量在正式站 CDN，與本機 static server 環境不同，不是同基準比較。留待部署後對 `dwselect.applepig.net` 重量再判定；若使用者決定改門檻，需明確裁決後才勾。

## ADR

- **active 商品狀態放在 `useState`（Nuxt 共享狀態）而非 DOM 事件內臨時掛 style**：AC3 要求返回時卡片在 new 快照前就有 name，這只有「詳情頁掛載時登記 active id、列表頁 render 時依 id 決定 style」做得到；純 pointerdown 掛 style 只能滿足 AC2。

## Milestones

- M1：`useActiveViewTransitionProduct`（或等價）＋ `product-card.vue`／`product-detail.vue` 改依 active id 掛 style＋測試（AC1–AC5）。
- M2：generate 後量測（AC6）、開頁看 morph 正反向、填 works.md。
