# Hotfix: iPad mini sparse category grid

## 問題描述

- **症狀**：iPad mini tablet 版面下，「網路通訊」分類只有 2 個商品時，商品卡片被拉成兩欄各約 50% 寬度。
- **預期行為**：tablet 版面應維持三欄 grid 欄寬，即使分類商品數少於三個，也不應讓既有卡片佔滿兩欄。
- **影響範圍**：首頁商品分類 grid；同樣使用 sparse card grid 的 related products grid 也有相同風險。

## 根因分析

- **根因**：產品 grid 在 base 與 tablet 樣式使用 `auto-fit`，少量項目會 collapse 空 track；tablet override 另將最小欄寬設為 `230px`，在 iPad mini 實際內容寬度下不足以容納三欄。
- **定位過程**：搜尋所有 `auto-fit` 後確認只有 `catalog.css` 三處；新增 tablet E2E 先重現「網路通訊」只有兩張卡時 computed columns 為 2。修正後再確認 repo 內已無 `auto-fit`。
- **受影響的檔案**：`app/assets/styles/catalog.css`、`tests/e2e/compact-app.spec.ts`、`playwright.config.ts`、`tests/dev-server-script.test.ts`。

## 修復內容

- **修了什麼**：將商品 grid 與 related products grid 的 `auto-fit` 改為 `auto-fill`，保留空欄位以避免 sparse items 被拉寬；tablet 產品 grid 最小欄寬由 `230px` 降為 `220px`，讓 iPad mini 內容區可容納三欄。
- **額外修正**：`playwright.config.ts` 現在會用 Node 內建 `process.loadEnvFile()` 載入 `.env`，避免本機跑 E2E 時需要手動帶 `APP_URL=dwselect.toybox.local`。
- **測試**：新增 tablet E2E regression，驗證 `/?category=network` 只有 2 個商品時仍維持 3 個 grid columns；新增 config regression，驗證 Playwright config 會在讀取 `APP_URL` 前載入 `.env`。
- **驗證結果**：`pnpm test` 通過；`pnpm test tests/dev-server-script.test.ts` 通過；`pnpm test:e2e --project=tablet tests/e2e/compact-app.spec.ts` 中新增 grid regression 通過；`pnpm lint:file -- playwright.config.ts tests/dev-server-script.test.ts tests/e2e/compact-app.spec.ts` 通過。完整 tablet E2E 另有既有搜尋 IME 測試失敗，失敗點是 search input 維持 disabled，與本次 grid 修復無直接關聯。
