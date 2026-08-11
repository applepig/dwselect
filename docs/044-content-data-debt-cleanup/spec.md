# 044 — 卡片短評摘要化與 Amazon 台幣換算價修正

## 背景

sprint 043 收尾時列出兩批已知但未處理的資料債，本 sprint 處理：

1. **87 筆 `short_description` 與 `long_description` 字串完全相同**。來源是 sprint 006 的 `migrate-product-compact-schema.ts` 把同一份舊 `description` 同時寫進兩欄（`docs/020` 已記載為「內容填充問題」，當時決議暫不處理）。
2. **8 筆日亞／美亞 offer 存著台幣換算價**（如 `TWD 10,366.70`、`NT$1,084.22`）。成因是 Amazon 依 IP 自動把價格換成當地貨幣，研究時照抄了換算值。

## 目標

兩個欄位各司其職：`long_description` 是詳情頁完整版、`short_description` 是首頁卡片放得下的短評。

## Scope

### 1. 卡片短評摘要化（25 筆）

**正確方向是保留完整版在 `long_description`，把 `short_description` 縮成卡片長度**——由 repo owner 於 2026-08-11 確認。

- 首頁 product card 的 `.product-summary` 是 `-webkit-line-clamp: 3`、`block-size: 4.65em`，實測約可容納 50 個中文字；超過就被 ellipsis 截斷成半句。
- 門檻定為 **40 字**：超過就從 owner 的原文摘要，未超過維持原樣。
- 摘要方式是**從 owner 自己的話裡取材**，保留其用詞與語氣，不另外造句、不加入原文沒有的判斷。
- `short_description` 一律**去掉結尾句號**（卡片語境不需要）。

實際分布：25 筆超過 40 字需摘要（壓到 19–40 字）、57 筆本來就 ≤40 字維持不動（其 `short` 與 `long` 因此相同，經 owner 確認保留）、3 筆本來就有獨立 long 內容不動、6 筆去掉結尾句號。

不派 subagent 執行：這是 owner 的個人語氣，交給平行 agent 逐檔改寫難以維持一致性，且 content 規則明訂 agent 不得自行撰寫這兩個欄位。改由 coordinator 逐筆摘要後，將前後對照表交 owner 核可。

#### 曾經走錯的方向（保留紀錄）

本 sprint first pass 誤把 87 筆的 `long_description` 清成 `""`、讓完整版留在 `short_description`，方向與需求相反，已全數還原。

該次判斷的技術陳述本身正確——`product-detail.vue:121` 是 `long_description || short_description` 且無 `v-if`，清空後詳情頁會 fallback，不會開天窗——但**技術上可行不等於是要的排版**：清空後首頁卡片就得吃下完整長文並被截斷，正是本 sprint 要解決的問題。教訓是欄位語意問題要先問 owner 要什麼版面，不能只從 render 是否為空推導。

### 2. Amazon 原幣別價格（8 筆）

由 8 個 `dwselect-content-researcher` subagent 各負責一個檔案，帶 `i18n-prefs` cookie 重抓原幣別價格，只改該筆 offer 的 `price_text`／`price.amount`／`price.currency`／`checked_at`。

Coordinator 對每一筆**獨立重抓驗證**，比對 `corePrice_feature_div` 價格與 `productTitle` 是否為該商品——起因是有 researcher 回報平行執行時共用 `scratchpad/amzn.html` 檔名而互相覆寫，讀到別的商品頁。

額外修正：`2026-06-20-mitsubishi-honsumigama-nj-bw10h` 的 `llm_description` 內嵌著 `TWD 11,815.12`／`TWD 13,900.14` 兩個過時台幣換算值，該欄位會顯示在詳情頁「AI 怎麼說」，故一併更正。

### 明確不改

| 項目 | 理由 |
|---|---|
| 8 筆的 `updated_at` | 它是 `compare-products.ts` 的主要排序鍵，一改這 8 筆會全部跳上首頁。這是修正舊資料的顯示錯誤，不是新的推薦，不該搶版面。`checked_at` 才是「何時確認過此價格」的語意欄位 |
| 25 筆摘要的 `updated_at` | 它是 `compare-products.ts` 的主要排序鍵，一改就會把這些舊商品全部推上首頁。本次是把既有文字改寫成卡片長度，不是新的推薦內容 |
| 57 筆 ≤40 字的 `short_description` | 本來就是卡片長度，再縮只會傷到原意。其 `short` 與 `long` 因此維持相同，經 owner 於 2026-08-11 確認保留 |
| `price.label`（`Prime Early Deal`、`限時優惠`） | 前端不顯示的 metadata；deal 狀態的判讀證據不足，不在本次範圍內臆測 |
| `2026-06-30-corsair-ai-workstation-300` 的價格 | 美亞頁面顯示 `Currently unavailable`、`corePrice_feature_div` 為空，無現行售價。頁面上其他 `$` 數字來自推薦商品輪播，取用等於捏造。依規則保留原值並回報 `offer_status`，禁止用匯率回推 |

## 驗收條件

- [x] 所有 `short_description` 皆 ≤40 字（摘要後 19–40 字），首頁卡片不再被 ellipsis 截斷成半句
- [x] `long_description` 全數維持原文，詳情頁「DW 怎麼說」內容不減
- [x] 摘要用詞取自 owner 原文，未加入原文沒有的判斷；前後對照表經 owner 核可
- [x] `short_description` 無結尾句號
- [x] 7 筆 Amazon offer 改為原幣別（6 筆 JPY、1 筆待決），`price.currency` 與 `channel_id` 相符
- [x] 每筆價格經 coordinator 獨立重抓核對，`productTitle` 與商品相符
- [x] Amazon 商品的 `llm_description` 不再含台幣換算價
- [x] `pnpm content:check` 全綠
- [x] skill／agent 文件中「87 筆待清理」「9 筆台幣價」等已過時的敘述同步更正

## 非本 sprint 範圍

**Corsair AI Workstation 300 的 offer 處置。** 2026-08-11 經 repo owner 決定**維持現狀**（保留 `TWD 54,214.38`），日後再處理。以下是本次查到的事實，供後續處理時直接使用、不必重查：

- 美亞 ASIN `B0GKPJRXW4`：頁面可正常取得（HTTP 200、1.78MB、`id="productTitle"` 正確），但有 `id="outOfStock"` 區塊「Currently unavailable. We don't know when or if this item will be back in stock.」，`corePrice_desktop` 與整個 centerCol 都沒有任何 `a-offscreen` 價格。agent-browser 實際渲染後結果一致。
- **不是幣別或反自動化問題**：同頁比較模組的其他 ASIN 正常顯示 `$1,899.99`、`$849.99`，證明 `i18n-prefs=USD` cookie 有生效。
- 第三方賣家：`/gp/aod/ajax` 回 404，無其他報價。
- Corsair 官方美國站同 SKU `CS-9080001-NA` 現價 **$1,699.99**、有現貨（該官網頁已在本檔 `reference_links`）。
- `54,214.38 ÷ 1,699.99 ≈ 31.9`，與當時台幣匯率相符，**可推定原本記錄的就是 $1,699.99 的台幣換算值**。
- 這個商品目前只有一筆 offer，所以頁面上顯示的是「買不到的商品的錯誤幣別價格」。日後選項：換成官網 offer（channel `other`）／保留美亞連結但清空價格／保留美亞連結寫入官網價（不建議，等於在 Amazon offer 上標 Amazon 不存在的價格）。
- 查證阻塞紀錄：camelcamelcamel 被 Cloudflare 403 擋；corsair.com 直接 `curl` 也 403，僅 agent-browser 可讀。
