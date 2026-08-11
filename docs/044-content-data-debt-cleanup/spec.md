# 044 — 清理 content 資料債：重複 long_description 與 Amazon 台幣換算價

## 背景

sprint 043 收尾時列出兩批已知但未處理的資料債，本 sprint 清掉：

1. **87 筆 `short_description` 與 `long_description` 字串完全相同**。來源是 sprint 006 的 `migrate-product-compact-schema.ts` 把同一份舊 `description` 同時寫進兩欄（`docs/020` 已記載為「內容填充問題」，當時決議暫不處理）。
2. **8 筆日亞／美亞 offer 存著台幣換算價**（如 `TWD 10,366.70`、`NT$1,084.22`）。成因是 Amazon 依 IP 自動把價格換成當地貨幣，研究時照抄了換算值。

## 目標

兩批資料回到正確狀態，且不動使用者的個人意見文字。

## Scope

### 1. 重複 long_description（87 筆）

正確修法是**清成 `""`**，不是重寫意見：

- 詳情頁是 `long_description || short_description`（`product-detail.vue:121`），清空後 fallback 到同一段文字，**rendered output 逐字不變**。
- 使用者原文完整保留在 `short_description`，一個字都沒改。
- 唯一可觀察影響是搜尋權重：`long_description` boost 3、`short_description` boost 1.5。這 87 筆原本因文字重複而拿到雙重加權，本身就是 migration bug 的副作用，清掉是回歸正常而非退化。

不派 subagent 執行：這是確定性機械改動，且 content 規則明訂 agent 不得撰寫 `short_description`／`long_description`（使用者個人觀點），讓 LLM 逐檔改寫反而有被潤飾竄改的風險。

### 2. Amazon 原幣別價格（8 筆）

由 8 個 `dwselect-content-researcher` subagent 各負責一個檔案，帶 `i18n-prefs` cookie 重抓原幣別價格，只改該筆 offer 的 `price_text`／`price.amount`／`price.currency`／`checked_at`。

Coordinator 對每一筆**獨立重抓驗證**，比對 `corePrice_feature_div` 價格與 `productTitle` 是否為該商品——起因是有 researcher 回報平行執行時共用 `scratchpad/amzn.html` 檔名而互相覆寫，讀到別的商品頁。

額外修正：`2026-06-20-mitsubishi-honsumigama-nj-bw10h` 的 `llm_description` 內嵌著 `TWD 11,815.12`／`TWD 13,900.14` 兩個過時台幣換算值，該欄位會顯示在詳情頁「AI 怎麼說」，故一併更正。

### 明確不改

| 項目 | 理由 |
|---|---|
| 8 筆的 `updated_at` | 它是 `compare-products.ts` 的主要排序鍵，一改這 8 筆會全部跳上首頁。這是修正舊資料的顯示錯誤，不是新的推薦，不該搶版面。`checked_at` 才是「何時確認過此價格」的語意欄位 |
| 87 筆的 `updated_at` | rendered output 逐字不變，沒有內容更新可言（同 043 的判斷） |
| `price.label`（`Prime Early Deal`、`限時優惠`） | 前端不顯示的 metadata；deal 狀態的判讀證據不足，不在本次範圍內臆測 |
| `2026-06-30-corsair-ai-workstation-300` 的價格 | 美亞頁面顯示 `Currently unavailable`、`corePrice_feature_div` 為空，無現行售價。頁面上其他 `$` 數字來自推薦商品輪播，取用等於捏造。依規則保留原值並回報 `offer_status`，禁止用匯率回推 |

## 驗收條件

- [x] 0 筆 `short_description === long_description`（清理後分布：92 筆空、3 筆有獨立主文）
- [x] 87 筆的 diff 僅含 `long_description` 一行，未動其他欄位或 JSON 格式
- [x] 7 筆 Amazon offer 改為原幣別（6 筆 JPY、1 筆待決），`price.currency` 與 `channel_id` 相符
- [x] 每筆價格經 coordinator 獨立重抓核對，`productTitle` 與商品相符
- [x] Amazon 商品的 `llm_description` 不再含台幣換算價
- [x] `pnpm content:check` 全綠
- [x] skill／agent 文件中「87 筆待清理」「9 筆台幣價」等已過時的敘述同步更正

## 非本 sprint 範圍

- Corsair 該筆 offer 的後續處置（保留、清價、或換賣場）須由 repo owner 決定。
