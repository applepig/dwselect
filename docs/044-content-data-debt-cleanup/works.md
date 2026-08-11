# Content Data Debt Cleanup Works

## 2026-08-11 implementation

### 變更摘要

- 87 筆 `long_description` 與 `short_description` 完全相同者清成 `""`；清理後分布為 92 筆空、3 筆有獨立主文、0 筆重複。
- 7 筆日亞／美亞 offer 改回原幣別；第 8 筆（Corsair）因美亞下架無現價而保留原值待決。
- `2026-06-20-mitsubishi-honsumigama-nj-bw10h` 的 `llm_description` 移除兩個過時台幣換算價。
- skill／agent 文件新增日本價格交叉驗證來源、平行 researcher 的暫存檔命名規則，並更正已過時的資料債敘述。

### 價格修正明細

| 商品 | 修正前 | 修正後 | 隱含匯率 | 獨立驗證 |
|---|---|---|---|---|
| toshiba 吸頂燈 | TWD 4,085.57 | `￥19,380` | 4.74 | ✅ 標題／價格重抓相符 |
| toshiba ER-D3000A | TWD 10,366.70 | `￥49,800` | 4.80 | ✅ |
| 三菱本炭釜 紬 | TWD 11,815.12 | `￥69,800` | — | ✅（商品已漲價） |
| king jim TEPRA PRO | TWD 2,028.44 | `￥10,973` | 5.41 | ✅ |
| recharge WiFi 100GB | TWD 2,838.31 | `￥12,980` | 4.57 | ✅ |
| VESSEL 電動起子 | TWD 672.30 | `￥3,973` | 5.91 | ✅ |
| 女神 Premium 簡易廁所 | NT$1,084.22 | `￥6,980` | 6.44 | ✅（商品已漲價） |
| Corsair AI Workstation 300 | TWD 54,214.38 | **未改** | — | 美亞 `Currently unavailable`、無現行售價 |

隱含匯率偏離 4.6–4.8 常態的幾筆（TEPRA 5.41、起子 5.91、女神 6.44）經逐筆重抓確認為商品本身漲價，非抓錯。

### 過程中發現的缺陷

**平行 researcher 共用暫存檔名互相覆寫。** `px-mitsubishi` 回報它第一次把 HTML 存成 `scratchpad/amzn.html`，內容被同時執行的其他 researcher 覆寫，讀到 Corsair 與 pocket WiFi 兩個無關商品頁；改用唯一檔名後結果才穩定。

因為這個缺陷會靜默產出「格式正確但屬於別的商品」的價格，coordinator 對全部 7 筆做了獨立重抓，逐筆核對 `corePrice_feature_div` 價格與 `id="productTitle"`，確認沒有污染寫進檔案。已把「暫存檔名必須帶 content id、parse 後務必核對 productTitle」寫進兩份 skill 的 Amazon fallback 段。

### 使用者要求的補充

日本價格改用價格.com（`https://kakaku.com`）交叉驗證，比照台灣的 BigGo／FindPrice。特別記錄它對日亞的價值：Amazon 依 IP 換台幣，而 kakaku.com 一律日圓原幣別，可直接驗證抓到的 `￥` 數字合理性。已寫進兩份 skill 與兩份 researcher agent 定義，並註明它是合理性交叉檢查、不取代通路頁權威來源。

### 驗證結果

- `pnpm content:check` → 113 個 content JSON 語法 OK、16 個測試檔、162 tests passed。
- 87 筆清理批次逐檔比對 diff：81 個非重疊檔案的變更行僅含 `long_description`（其餘 6 筆與價格批次重疊，diff 為 `long_description` + offer 價格欄位，無其他污染）。
- 依 CLAUDE.md 的分級規則，本次為 `content/**` 與文件改動，gate 為 `content:check`，不需全套 verify。
