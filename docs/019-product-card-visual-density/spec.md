# Product Card Visual Density

## Goal

調整首頁 product card 與深色背景的視覺密度，讓商品列表在 mobile、iPad、desktop、ultrawide 都更乾淨，降低行銷圖與 overlay 資訊互相打架的問題。

## Non-Goals

- 不更動 content 資料結構。
- 不更動商品排序、分類邏輯、routing 或 public payload。
- 不重新設計 navigation、詳情頁或搜尋頁。
- 不改商品圖片來源或重新裁圖。

## User Story

作為使用者，我在首頁瀏覽商品清單時，可以快速辨識商品名稱、價格與通路，而不會被深色背景髒感、過厚卡片 padding 或圖片上的價格 overlay 干擾。

## Acceptance Criteria

- 深色版首頁主背景不再使用高存在感琥珀斜向漸層，視覺應更接近乾淨深色底。
- Product card 圖片切齊卡片左右與上緣，上方圓角與卡片圓角一致。
- Product card 文字區 padding 比現況更緊湊，但仍保留可讀性。
- Product card 商品名稱／描述文字區固定為三行高度，讓同一 row 的價格與通路列能對齊。
- 價格資訊移到文字區左下，不再壓在商品圖片上。
- 通路資訊移到文字區右下，不再壓在商品圖片上。
- 首頁需在 mobile、iPad、desktop、ultrawide viewport 可正常載入並維持合理 grid 排版。

## Milestones

- [x] M1：調整 CSS／markup 讓背景與 product card 視覺密度符合驗收條件。
- [x] M2：執行測試與多 viewport 視覺驗收，並記錄結果。

## ADR

- 先採用「減框、減 overlay」方向，不採用白底內縮相框；iPad、desktop、ultrawide 觀察後，滿版圖片切齊比新增相框更能降低卡片厚重感。
