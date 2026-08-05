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

## 2026-08-05 PR #22 review fixes

### Finding 1「Preserve the fine print outside the purchase summary」— 不採納

- 使用者確認原始需求是**整頁移除**價格免責文字，不是換到摘要卡外。Codex 的推論來自文件缺口：`plan.md` 與驗收條件都只寫「摘要卡不重複⋯價格免責文字」，語意停在卡內，沒有一句記錄「整頁移除」的決定。
- 處置：程式碼維持 PR 原狀（不顯示 `fine_print`）；改為把決定寫進 spec——新增 ADR-3、補一條非目標與一條驗收條件，讓後續 review 讀得到依據。
- 連帶修正：ADR-2 原文「摘要卡僅顯示價格、通路、**免責**與 CTA」與驗收條件「不顯示 `fine_print`」自我矛盾，已移除該處「免責」字樣。
- 測試從「摘要卡內不顯示」收緊為「整頁不顯示」（含 `.detail-fine-print` class 與 fallback 文案），需求被違反時才會紅。
- 清除本次改動造成的 dead CSS：`catalog.css` 三處 `.detail-fine-print` 規則已無 template 使用。（`.detail-description` 同樣無人使用，但早於本次改動，依最小修改原則不動。）
- 遺留：`mapProductDetail` 仍供應 `fine_print`，在公開站成為未使用欄位；本 sprint 非目標不動 payload，見 ADR-3 影響段。

### Finding 2「Avoid hard-coding the attributes under test」— 採納

- `guide-detail-render.test.ts` 的 `UButtonStub` 不再寫死 `target`／`rel`，改由呼叫端 fallthrough 到 root anchor；元件真的漏掉安全外連屬性時測試才會紅。
- 改完 Guide 兩個「看原文」CTA 測試仍全綠，證明 `GuideDetail` 本來就正確傳遞這兩個屬性——此為測試效力缺陷，非行為 bug。

### 驗證結果

- 容器內 CI-equivalent `dev.sh verify`（test→lint→knip→typecheck→generate）EXIT=0：97 個測試檔、680 tests passed；prerendered 1544 routes。
- 實際開啟 dev server 的 `/products/2026-06-02-aibo-qi-power-bank`：摘要卡後直接接參考資料、無免責文字；390×844 下摘要卡垂直、CTA 全寬、`scrollWidth == clientWidth == 375` 無水平溢出。
