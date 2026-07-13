# Hotfix: Detail Empty Image

## 問題描述

- **症狀**：Product／Guide detail 的 `hero_image_url` 為空時，元件仍渲染固定 1:1 的 `.detail-hero-tile`；Guide 還會顯示 image-off icon，形成空白 placeholder。
- **預期行為**：沒有 hero image URL 時不渲染 hero tile 或 fallback icon，並保留可用的返回操作。
- **影響範圍**：無本地或外部圖片的 Product／Guide detail，已存在 5 個無圖 Guide。

## 根因分析

- **根因**：hero tile 的外層沒有依 `hero_image_url` 條件渲染；只有 image element 本身在 Guide 中被條件控制，Product 甚至會將空 URL 傳給 `NuxtImg`。
- **定位過程**：比較 Product 與 Guide detail template，並以 `2026-06-19-dishwasher-buying-guide` 重現。兩者均固定保留 `.detail-hero-tile`；Guide detail payload 對無圖內容明確輸出空字串。
- **受影響的檔案**：`app/components/product-detail.vue`、`app/components/guide-detail.vue`、`app/assets/styles/catalog.css`、hero／Guide render tests。

## 修復內容

- **修了什麼**：僅在 hero URL 非空時渲染 tile；空 URL 時將返回按鈕移至 summary 欄的正常流動位置。具有 URL 但載入失敗時維持既有 fallback icon。
- **測試**：新增 Product／Guide 空 URL 不渲染 tile、fallback icon 且仍有返回操作的行為測試；更新既有 Guide 無圖測試。
- **驗證結果**：Red 為 2 個測試檔、3 個預期失敗；Green 為 2 個測試檔、25 tests passed。`pnpm test` 在獨立重跑後通過（97 個測試檔、675 tests）；`pnpm lint`、`pnpm typecheck` 通過。實際開啟 `https://dwselect.toybox.local/guide/2026-06-19-dishwasher-buying-guide`，確認 `hero_tile: false`、`fallback: false`、`back_button: true`。

### Codex review 修正

- **[無圖 Guide 在 tablet／desktop 留下空白 grid column]**：無圖 detail layout 加上狀態 class，讓 summary column 跨滿所有 grid columns。1024px 實測 summary 775.98px／layout 776px；1440px 為 963.98px／964px。相關 4 個測試檔、38 tests passed；完整 `pnpm test`（97 個測試檔、675 tests）、`pnpm lint` 與 `pnpm typecheck` 通過。
