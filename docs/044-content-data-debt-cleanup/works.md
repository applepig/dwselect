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

### kakaku.com 第二來源交叉驗證（補做）

上述重抓驗證有個弱點：抓的是**同一個來源**（Amazon 商品頁），能抓出「檔案覆寫導致讀到別的商品」，但抓不出「Amazon 這個數字本身讀錯」。使用者指出這點後補做獨立第二來源驗證。

（注意時序：8 個 researcher 執行時 kakaku 規則尚未寫入 skill，因此**它們並未使用**第二來源；本節是 coordinator 事後補驗。）

| 商品 | 我們寫入 | kakaku | 判定 |
|---|---|---|---|
| 東芝吸頂燈 NLEH14028B-LC | `￥19,380` | 最低 19,380 | ✅ 完全一致 |
| 東芝石窯 ER-D3000A | `￥49,800` | 45,700–89,870 | ✅ 落在區間 |
| 三菱本炭釜 NJ-BW10GA-B | `￥69,800` | 69,800（唯一值） | ✅ 完全一致 |
| King Jim TEPRA SR-MK1 | `￥10,973` | 10,973 | ✅ 完全一致 |
| VESSEL 220USB-S1 | `￥3,973` | 最低 4,370 | ✅ Amazon 折扣，見下 |
| Recharge WiFi T8BK-100GB | `￥12,980` | 無收錄 | 通信服務類，kakaku 不收 |
| 女神 Premium | `￥6,980` | 無收錄 | 防災用品類，kakaku 不收 |

起子低於 kakaku 最低價約 9%，起初可疑；但該 Amazon 頁面 `basisPrice` 為 `￥7,480`、offer 的 `price.label` 是 `Prime Early Deal`，屬 Amazon 自家折扣，與 5.91 的隱含匯率一致，判定合理。

過程中摸出的 kakaku 實作細節（`p-item_priceNum` selector、`&#165;` entity、EUC-JP 編碼、必須逐項配對商品名以免混入配件低價）已寫進兩份 skill，讓規則可直接執行而非空泛引用。

### 過程中發現的缺陷

**平行 researcher 共用暫存檔名互相覆寫。** `px-mitsubishi` 回報它第一次把 HTML 存成 `scratchpad/amzn.html`，內容被同時執行的其他 researcher 覆寫，讀到 Corsair 與 pocket WiFi 兩個無關商品頁；改用唯一檔名後結果才穩定。

因為這個缺陷會靜默產出「格式正確但屬於別的商品」的價格，coordinator 對全部 7 筆做了獨立重抓，逐筆核對 `corePrice_feature_div` 價格與 `id="productTitle"`，確認沒有污染寫進檔案。已把「暫存檔名必須帶 content id、parse 後務必核對 productTitle」寫進兩份 skill 的 Amazon fallback 段。

### Corsair 一筆的處置

`px-corsair` 完整查證後回報阻塞、未動任何欄位，並主動附上官網 `$1,699.99` 佐證與 `54,214.38 ÷ 1,699.99 ≈ 31.9` 的匯率推算，但**沒有自行寫入**——因為那是官網價而非美亞當下顯示價，超出「照抄頁面數字」的授權範圍。這是正確判斷。

2026-08-11 向 repo owner 提出四個選項（換官網 offer／清空價格／寫入官網價／維持現狀），決定為**維持現狀**，日後再處理。查證細節已完整記入 spec 的「非本 sprint 範圍」，後續處理不需重查。

### 使用者要求的補充

日本價格改用價格.com（`https://kakaku.com`）交叉驗證，比照台灣的 BigGo／FindPrice。特別記錄它對日亞的價值：Amazon 依 IP 換台幣，而 kakaku.com 一律日圓原幣別，可直接驗證抓到的 `￥` 數字合理性。已寫進兩份 skill 與兩份 researcher agent 定義，並註明它是合理性交叉檢查、不取代通路頁權威來源。

### 驗證結果

- `pnpm content:check` → 113 個 content JSON 語法 OK、16 個測試檔、162 tests passed。
- 87 筆清理批次逐檔比對 diff：81 個非重疊檔案的變更行僅含 `long_description`（其餘 6 筆與價格批次重疊，diff 為 `long_description` + offer 價格欄位，無其他污染）。
- 依 CLAUDE.md 的分級規則，本次為 `content/**` 與文件改動，gate 為 `content:check`，不需全套 verify。
