# 043 — Description 欄位改名為 short / long / llm 三格

## 背景

Content schema 的描述欄位命名不一致，造成 agent 反覆填錯：

- Product 有三格描述，但命名是 `summary` / `long_description` / `llm_description`——只有 `summary` 不帶 `_description` 後綴，看不出它與另外兩格是同一組。
- `content/AGENTS.md` 把 `long_description` 描述為「詳細說明。同上」，模糊到看不出它是詳情頁主文。
- 實際後果：2026-08-10 有一次 content 研究把使用者給的一句話拆成 `summary` 一半、`long_description` 一半。UI 兩欄擇一顯示（卡片讀 `summary`、詳情頁讀 `long_description || summary`），結果兩個畫面都只看得到半句。
- Search document 另有一組模糊命名：`summary`（來源是 content 的短描述）與 `description`（來源是 `long_description`），`docs/020` 已記載此問題。

Guide 與 Link 各只有一格描述，也叫 `summary`，與 product 的短描述語意相同但缺少對稱命名。

## 目標

三種 content type 統一用 `short_description`，讓 product 的三格成為 `short_description` / `long_description` / `llm_description`，全站不再出現 `summary` 作為資料欄位名。

## Scope

### 改名（資料欄位）

| 位置 | 舊 | 新 |
|---|---|---|
| Product / Guide / Link content JSON（108 檔） | `summary` | `short_description` |
| zod schema `app/utils/product-schema.ts`（三處） | `summary` | `short_description` |
| Generated JSON Schema `content/.schema/*.json` | 由 zod 重新產生 | — |
| View model `app/utils/public-content-view-types.ts`（三處） | `summary` | `short_description` |
| Payload mappers `scripts/public-payload/*.ts` | `summary` | `short_description` |
| Search document `app/utils/search/search-index.ts` | `summary` | `short_description` |
| Search document（同上） | `description` | `long_description` |
| UI components 與 pages 的屬性存取 | `.summary` | `.short_description` |
| `scripts/legacy/migrate-product-compact-schema.ts` | `summary` | `short_description` |

### 明確不改

| 項目 | 理由 |
|---|---|
| CSS class `.product-summary`、`.search-suggestion-summary`、`.detail-summary-column` | UI 元素命名，不是資料欄位 |
| View transition part `'summary'`（`product-view-transition.ts`） | VT slot 名稱，與資料欄位無關 |
| RSS `RssItem.summary`（`scripts/build-public-discovery.ts`） | RSS/Atom 的輸出格式欄位，屬外部契約；只改其資料來源 |
| `scripts/legacy/migrate-content-domain-taxonomy.ts`、`migrate-category-tag-taxonomy.ts` 的欄位 | 這兩支輸出的是當時的中繼格式、型別自成一格不引用現行 schema，改動只會扭曲歷史意圖 |
| 遷移統計變數 `const summary = createSummary()` 等 | 是「摘要統計」語意，非資料欄位 |
| `docs/` 既有 sprint 文件 | 歷史紀錄，保留當時用語；skill 已加註舊名對照 |
| 108 筆改名紀錄的 `updated_at` | `updated_at` 是 `compare-products.ts`／`compare-guides.ts`／`compare-links.ts` 的**主要排序鍵**，一次全改成同一個遷移時間會讓主鍵全部並列，首頁「最新在前」退化成 category + 名稱字母序（sprint 034 修過的維度）。且本次是純 key 改名、rendered output 逐字元不變，推 108 個 `<lastmod>` 等於對搜尋引擎謊報更新。詳見 `works.md` review finding 1 |

## 驗收條件

- [x] 108 個 content JSON 的 `summary` key 改名為 `short_description`，且維持原本的 key 順序
- [x] `pnpm typecheck` 0 error
- [x] `pnpm test` 全綠（678 tests）
- [x] `pnpm content:check` 全綠（162 tests）
- [x] `pnpm lint` 全綠
- [x] `content/.schema/*.json` 由 zod SSOT 重新產生，不含 `summary`
- [x] Search document 的 `description` 一併正名為 `long_description`，SEARCH_FIELDS / BOOSTS / STORE_FIELDS 同步
- [x] `content/AGENTS.md`、skill、agent 文件的欄位名與說明同步更新
- [x] 頁面實際打開確認卡片短評、詳情頁「DW 怎麼說」、搜尋建議都正常顯示

## 非本 sprint 範圍

- **87 筆 `short_description` 與 `long_description` 字串完全相同的資料**。那是 sprint 006 migration（`migrate-product-compact-schema.ts` 把同一份舊 `description` 複製進兩欄）留下的未清理遺留，`docs/020` 已記載為「內容填充問題」。清理等於逐筆重寫使用者的個人意見，須由 repo owner 決定。
- 另外 8 筆日亞／美亞 offer 存著台幣換算價格（見 PR #25），需逐筆重抓原幣別價格。
