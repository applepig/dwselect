# Product Purchase Summary Works

## 2026-08-05 implementation

### 變更摘要

- Product detail 的價格後方新增所有 viewport 可見的主購買 CTA。
- AI 說明後、參考資料前改為含價格與通路的 purchase summary，兩個 CTA 使用相同安全外連設定與文案。
- purchase summary 在 mobile 垂直排列並提供全寬 CTA；tablet 與 desktop 可讓資訊和 CTA 並排。
- Guide detail 的「看原文」CTA 保持原有 URL 與外連行為。
- E2E 改為驗證可觀察的首頁非預抓與詳情導覽行為，並移除以動態 CMS 短字樣作為 layout fixture 的斷言。

### 驗證結果

- `pnpm test` → 97 個測試檔、678 tests passed。
- `pnpm content:check` → 16 個測試檔、162 tests passed。
- `pnpm test:e2e --project=phone tests/e2e/compact-app.spec.ts --grep="does not fetch details on home and opens the selected product"` → 1 passed。
- `pnpm test:e2e --project=tablet tests/e2e/related-products-layout.spec.ts --grep="wraps long meta pills"` → 2 passed。
- 實際開啟 `https://dwselect.toybox.local/products/2026-08-05-toire-no-megami-premium`：商品、圖片、價格、通路、上下 CTA 與 purchase summary 均正確顯示。
