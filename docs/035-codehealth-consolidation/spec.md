# 035 Code Health 收斂（codehealth-consolidation）

> 狀態：已確認，執行中（2026-07-07 使用者確認開工，035 base reset 至 025 tip 79ff19f；2026-07-07 revise：對齊已完成的 025 交界；同日 xreview 三模型交叉審查後修訂 AC 可驗收性與 scope，新增 ADR-035-5/6）
> 建立日期：2026-07-05
> 分支：`feat/035-codehealth-consolidation`（接在 **025 merge 後的 master** 之上開出——035 M2/M4 會再動 025 已整理過的測試檔，從 cc5a0ee 開會大面積衝突）
> 來源：2026-07 全專案技術債審查（雙 reviewer 交叉審查＋coordinator 抽驗）；025 執行後的交界依 `docs/025-test-quality-cleanup/works.md` 定案校準

## 背景

2026-07 對全專案做了技術債審查，findings 經使用者逐條裁示後分流：

- **本 sprint（035）**：單一真相收斂（content 存取、站台 URL、detail 共用邏輯）、化石清運＋knip 導入、Node 版本釘齊、其餘小項。
- **025（已完成，2026-07-05）**：source-grep 假斷言測試存量清理、釘死 content 資料值的測試已全數執行（suite 634→576）。025 執行中將三處交界明文交棒 035，本 sprint 承接：
  - back-nav source-grep（`product-detail-back-navigation.test.ts` it #1、`guide-detail-back-navigation.test.ts` 整檔）續留，待 035 抽 composable 後取代 → **AC7 / M4**。
  - server route wiring source-grep（`server-content-routes.test.ts` route 段、`server/detail-route-id-resolution.test.ts` it #1）→ **AC2b / M2**（使用者 2026-07-07 裁示納入本 sprint；detail route 行為其實已由 028 的 `detail-route-handler.test.ts` 涵蓋，025 works 誤記為無覆蓋）。
  - tag-explorer 的 adoption grep it 已由 025 代刪，035 只需移除元件本體 → **AC10**（測試側工作面積縮小）。
- **036（後續 sprint）**：deploy 到 Cloudflare 取得 preview URL 後先跑 E2E 再 launch、artifact 提升（部署 gate 驗過的產物而非重新 generate）。
- **不處理**：GTM container id 環境分流（使用者裁示不動）。

## 目標

1. 同一條 business rule 全 repo 只有一份實作：published 判定、content 讀取、站台 URL/名稱、detail 頁共用行為（back-navigation、破圖 fallback、related-products 區塊）。
2. 清除功能下架後的化石（死元件、死 CSS、死 util、不可達分支、已完成的 migration），並以 knip 固化 dead-code 偵測，防止再堆積。
3. 開發容器與 CI 的 Node major 版本一致，`./dev.sh verify` 的「CI 等價」宣稱成立。
4. 審查列出的低嚴重度小項一併清掉（詳見 M6）。

## 非目標

- 不清理 source-grep 假斷言測試存量（025 另案）；但**行為已隨本 sprint 移除的程式碼，其對應測試與斷言連帶刪除**——判準是「行為還在不在」，這是正確同步，不是測試債清理。
- 不動 GTM 注入。
- 不改 deploy 流程與 E2E gate（036 另案）。
- 不回收 product schema 的 `slug` 欄位（有 027 ADR 背書，slug≠id 是否落地屬內容策略，另案討論）。
- 不新增任何使用者可見功能；除 `content-markdown` heading level 修正（M6，行為修正）外，所有頁面渲染輸出應不變。

## User Story

作為專案維護者，我想要每條 business rule 只有單一實作、且 codebase 沒有死碼誤導，以便未來需求（排程發布、換網域、新增第三種 detail 頁）只需改一處，不會因平行定義靜默分歧或被化石帶錯方向。

### 驗收條件

（AC 除明確標註「implementation constraint」的條款外，均為可觀測行為：輸入→輸出、render 結果、讀 resolved 值；不以原始碼字面為斷言對象。implementation constraint 是行為測試原理上測不到的結構性約束——兩份結果一致的平行實作會讓所有行為測試全綠——故誠實標註為 review 檢查項，不硬湊字串斷言充數。）

**content-source 單一真相**
- [x] AC1：給一組含 `draft` 與 `published` 的 content fixture，各 artifact 的「適用集合」收錄 id 一致且 draft 一律缺席，依內容類型分列（links 本無 detail route，不能要求四類產物集合齊一）：
  - products／guides：prerender routes、public payload、search index、sitemap、RSS 五處 id 集合完全一致。
  - links：public payload、search index、RSS 三處 id 集合完全一致（不進 prerender routes 與 sitemap detail URL，維持現況）。
  - taxonomy sitemap 收錄集合＝non-empty taxonomy id 集合（與 route builder 同源，現況已共用 `collectNonEmptyTaxonomyIds`）。
- [x] AC2：同一 draft/published fixture 經 build scripts、server routes、search index builder 讀取，resolved output 一致（行為驗收：module 單元測試＋各消費端行為測試）。「published 判定只存在一個 exported function、所有消費端讀取經由 content-source module」為 **implementation constraint**——以 M2 完工時的 review 檢查驗收（比照 AC17 的驗收限制標註），不以 grep 斷言、也不假裝行為測試能守住它。
- [x] AC3：guide 搜尋結果的縮圖 URL 與 guide 頁面縮圖 URL 對同一筆 fixture 解析結果相同（同一 resolver）。
- [x] AC2b（025 交棒的 server route wiring 行為化）：`content.json`、`search-index.json` 兩個 server route 各補一份真正 invoke handler 的測試（比照現成 `tests/server/detail-route-handler.test.ts` 的 nitro 全域 stub＋動態 import pattern），斷言 handler 經 content-source 讀取並回傳對應 builder 的 payload；隨後移除 `server-content-routes.test.ts` 的 route 原始碼字串斷言，與 `server/detail-route-id-resolution.test.ts` it #1（純 `toContain('extractContentId(event.path)')`）。detail route 的 404／event.path 取 id 行為已由 `detail-route-handler.test.ts` 涵蓋，該 grep 屬冗餘直接刪。判準：route 內部重構（換 helper 名、調 import）行為不變時測試不紅。

**站台 URL/名稱 env 化**
- [x] AC4：以 `APP_URL=example.test` 執行 generate，產出的 canonical、og:url、og:image、sitemap/discovery、payload `site.url` 的 resolved 值全部以 `https://example.test/` 為前綴；換回 `dwselect.applepig.net` 亦然——站台 URL 跟著環境走，無殘留寫死值。
- [x] AC5：`APP_URL` 未設定時，generate 以非零碼中止並輸出可辨識的錯誤訊息；scripts 端同樣 fail loud。**需修改**既有 nuxt.config guard——現況（`nuxt.config.ts:12-15`）刻意豁免 `generate`/`build` 且 `vite_host` 靜默 fallback 到 `dwselect.toybox.local`，與本條相反；移除豁免與寫死 fallback 是本條的實作內容，屬行為變更（見 ADR-035-5）。
- [x] AC6：payload 與 SEO meta 讀到同一 `SITE_NAME` resolved 值（DW嚴選）（行為驗收）。「只有一處定義」為 **implementation constraint**，同 AC2 以 review 檢查驗收。

**detail 共用行為收斂**
- [x] AC7：back-navigation 行為由單一 composable 提供並在 composable 層測試一份：same-origin referrer 時返回上頁、外部/空 referrer 時導向 fallback route、protocol-relative（`//`）referrer 視為外部。product/guide 兩頁行為與現況一致。抽成 composable 後，移除 025 續留的 `product-detail-back-navigation.test.ts` it #1 與 `guide-detail-back-navigation.test.ts` 整檔 source-grep（行為由新 composable 測試取代，避免雙軌覆蓋）。
- [x] AC8：破圖偵測與 fallback（載入失敗顯示 placeholder）由單一 composable 提供；product detail、guide detail、resource-list 三處行為與現況一致。
- [x] AC9：related-products 卡片區塊由共用元件渲染，product/guide detail 頁斷言具體不變結構——卡片數量、每張卡的連結 href 與標題文字與現況一致；不以整段 DOM snapshot 貼回當 expected（snapshot 反模式）。

**化石清運＋knip**
- [x] AC10：`TagExplorer` 元件、其專屬 CSS、`format-published-date` util、search-index 的 `Product[]` legacy union 入參、搜尋歷史直寫軌 API、compact-app view 的 `tabs`/`active_tab`/`counts`/`'no-results'` 分支移除後，`pnpm test` 全綠且首頁/guide/links/search 頁 render 輸出不變。（M1 達成；`active_tab` route-state 側孤兒經 /simplify 收尾清乾淨。**四頁人工開頁已驗**——容器 rebuild 後經 agent-browser 開 `dwselect.toybox.local` 四頁：首頁 76 cards＋分類 nav、guide 指南列表、links、search 熱門標籤/品牌 pills，render 結構完整無破。）
- [x] AC11：已完成的 migration scripts（`migrate-content-slug`、`legacy/*`、`localize-content-images`）移入 `scripts/legacy/` 且不在預設測試集內；`pnpm test` 不再執行其測試。（`localize-content-images` 退役依據：authoring 文件 CONTENT.md/AGENTS.md 均未提及、現有 content `image_url` 全為 null；留在 legacy/ 可隨時復活。）
- [x] AC12：`pnpm knip`（knip 6.25.0，`knip.json` 用內建 nuxt plugin 載 nuxt.config 取 Nuxt 慣例 entry、避開 Case 4 誤報）在清運完成後回報零 unused files/exports，並納入 `./dev.sh verify` 鏈（test→lint→knip→typecheck→generate）與 CI；人為加入未引用 export 時以非零碼失敗（probe 實測攔截）。**三環境零報告**：host、CI（prepare hook 生成完整 `.nuxt`）、容器（`cmd_knip` 於 `is_container` 分支先對預設 `.nuxt` 補冪等 `nuxt prepare` 補全 auto-import manifest——knip nuxt plugin 寫死讀 `.nuxt/components.d.ts`、無視 `NUXT_BUILD_DIR` 隔離，而容器 build-mode 的 manifest 由 `nuxt generate` 產出、不含 component 註冊致誤報）。清運同時刪 `CompactLinkRow`/`CompactGuideRow` 死型別、移除從未接線的 `postcss-nesting` devDependency。

**環境一致性與小項**
- [x] AC13：容器內 `node --version` 與 CI workflow 的 node-version 同為 24.x；`./dev.sh exec ./dev.sh verify` 全綠。
- [x] AC14：`pnpm exec vitest run`（不經 dev.sh）不會執行 `tests/e2e/**`（Playwright spec 不再被 vitest 撿到）。
- [x] AC15：`content-markdown` 渲染 heading 時依 parser 的 level 輸出 `<h2>/<h3>/<h4>`（現況一律 `<h4>`）；detail 頁標題階層以 render 測試驗證。
- [x] AC16：淺色/深色模式下 detail 買入 CTA 按鈕文字顏色皆來自 `--dw-*` token（讀 computed style 驗證，不用「CSS 含 `var(--dw-…)`」的字串斷言）；移除 `catalog.css:839` CTA 的直寫色值 `#fffaf1`。範圍精確限定於該處——`variables.css:5` 的 `--dw-panel: #fffaf1` 是 token 定義本體，合法保留。
- [x] AC17：`package.json` name 為 `dwselect`；Docker image build 使用 `--frozen-lockfile`；`toybox-local-root-ca.crt` 進 `.gitignore`。（此條為 config 變更本身，驗收方式：人工檢查＋容器 rebuild 成功。）

## 相關檔案

- `scripts/content-reader.ts`、`scripts/public-content.ts`、`scripts/read-published-taxonomy-items.ts`、`scripts/build-product-routes.ts`、`scripts/build-guide-routes.ts`、`scripts/public-payload/build-navigation.ts`（L23、L87 兩處 inline filter，xreview 抓漏補入） — content 讀取／published 判定的既知分歧點，收斂目標；此清單是起點非全集，M2 動工前先全域掃 `status === 'published'` 補全消費端清單
- `app/utils/search/search-index.ts` — inline published filter、legacy union、重複的 guide image resolver
- `server/api/content.json.get.ts`、`server/routes/search-index.json.get.ts`、`server/api/{products,guides}/[id].json.get.ts` — content-source 消費端 server route；`tests/server-content-routes.test.ts`（route 段 source-grep 待行為化）、`tests/server/detail-route-handler.test.ts`（現成 handler-invocation pattern）、`tests/server/detail-route-id-resolution.test.ts`（it #1 冗餘待刪）— AC2b 對象
- `app/utils/seo-metadata.ts`、`app/utils/public-content-payload.ts` — SITE_URL/SITE_NAME/og-image 平行定義
- `app/components/product-detail.vue`、`app/components/guide-detail.vue`、`app/components/resource-list.vue` — back-navigation／破圖／related 卡片複製來源
- `app/components/tag-explorer.vue`、`app/assets/styles/catalog.css`、`app/utils/format-published-date.ts`、`app/utils/published-products/compact-app.ts`、`app/utils/search/client-search.ts` — 化石清運對象
- `Dockerfile`、`.github/workflows/static-generate.yml`、`.github/workflows/deploy.yml`、`dev.sh`、`vitest.config.ts`、`package.json` — 環境一致性與小項
- `nuxt.config.ts` — APP_URL guard（SITE_URL 導出掛接點）

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| `isPublished` | `scripts/public-content.ts:9` | 作為收斂種子搬入 `app/utils/content/`（browser-safe，client/Node 共用），全部消費端改引用它 |
| zod content schemas ＋ async reader | `scripts/content-reader.ts` | content-source 的讀取核心；sync 最小欄位 reader（route builder 用）併入同 module |
| `resolveGuideImageUrl` | `app/utils/content-images/resolve-guide-image-url.ts` | search-index 改 import 它，刪本地重複 |
| `useTaxonomyDetailPage` | `app/composables/use-taxonomy-detail-page.ts` | 032 收斂四 taxonomy 頁的範本——detail 共用 composable 沿用同一 pattern（composable 收 route/fallback 參數、頁面薄殼） |
| `catalog-pill.vue`、`EXTERNAL_LINK_ATTRS`、row icon map | `app/components/`、`app/utils/`（032 產物） | related-products 共用元件內部沿用，不新造視覺原子 |
| `--dw-*` token 系統 | `app/assets/styles/variables.css` | CTA 色值 token 化直接取用／必要時新增 `--dw-on-accent` |
| published-products 測試 fixtures | `tests/published-products/fixtures.ts` | AC1 的 draft/published fixture 基礎 |
| `APP_URL` 三態機制 | `.env`／`dev.sh verify`／CI workflow env | SITE_URL 直接由 `APP_URL` 導出，不新增第二個環境變數 |
| nuxt.config APP_URL guard | `nuxt.config.ts:11-15` | AC5 的**待修正點**（非沿用）：現況豁免 generate/build 並 fallback toybox，需移除豁免與 fallback（ADR-035-5）；scripts 端補等價檢查 |
| 025 works（已完成） | `docs/025-test-quality-cleanup/works.md` | 交界 SSOT：back-nav grep（M2/M5 段落）、server route residual（M5 段落）、tag-explorer 已代刪（M4 段落）三處交棒定案的依據 |
| handler-invocation 測試 pattern | `tests/server/detail-route-handler.test.ts`（028 產物） | AC2b 補 content.json／search-index.json 兩 route handler 測試的範本，不新造 stub 手法 |

新建項目：
- `scripts/content-source/`（或擴充 `content-reader.ts`）— 既有三套 reader 職責分裂，無單一入口可沿用，需整併（見 ADR-035-1）。
- `useDetailBackNavigation`、`useBrokenImageFallback` composables、`related-products-section.vue` — 現為兩～三處逐字複製，已達抽象門檻，無既有可用單元。
- knip 設定 — 專案目前無 dead-code 偵測工具。

## 介面/資料結構

無對外 API 變更（靜態站產物結構不變）。內部介面草案（實作時可微調，職責邊界不可變）：

```ts
// app/utils/content/is-published.ts（browser-safe 純 predicate；零 Node 依賴）
// client（search-index 經 client-search 進 browser bundle）與 Node 端（scripts、server routes）
// 都 import 這一份；不得與含 node:fs 的 reader 同檔或經 barrel 相連，
// 否則 Vite 解析依賴鏈時 client bundle 會炸在 node:fs（xreview finding）
export function isPublished(content: { status: string }): boolean

// scripts/content-source/（唯一 content 讀取入口；無狀態純函式；Node-only，app/ 不得 import）
export async function readPublishedProducts(dir: string): Promise<Product[]>
export async function readPublishedGuides(dir: string): Promise<Guide[]>
export async function readPublishedLinks(dir: string): Promise<Link[]>
export async function readTaxonomies(dir: string): Promise<PublicTaxonomies>  // 型別單一定義，刪重複
// route builder 需要的 sync 輕量讀取也收於此，不再各自私有實作

// 站台識別（單一定義；scripts 讀 process.env.APP_URL，app 經 Nuxt 設定烤入）
export const SITE_NAME = 'DW嚴選'
export function getSiteUrl(): string  // `https://${APP_URL}/`；缺席時於「呼叫時」throw，不得 module top-level eager throw（避免 vitest/consumer import 即炸）

// app/composables/
export function useDetailBackNavigation(fallback_route: string): { goBack: () => void }
export function useBrokenImageFallback(): { isBrokenImage: (id: string) => boolean, onImageError: (id: string) => void }
```

## 邊界案例

- **Case 1：draft-only 內容集**——所有產物（routes、payload、search index、discovery）輸出空集合而非報錯；列表頁顯示既有 empty 狀態。
- **Case 2：`APP_URL` 未設定跑 generate**——非零碼中止＋可辨識錯誤訊息（AC5），不得靜默 fallback 到任何寫死網域。（現況 nuxt.config 正是靜默 fallback 到 toybox，AC5 會移除之；此為行為變更，tradeoff 見 ADR-035-5。）
- **Case 3：protocol-relative referrer（`//evil.example`）**——back-navigation 視為外部來源，走 fallback route（現有防護不得因抽 composable 而弱化）。
- **Case 4：knip 對 Nuxt 自動匯入的誤報**——pages/components/composables 由 Nuxt 慣例載入，knip 設定需正確宣告 entry/project，初始 baseline 必須是真零誤報，不得用大面積 ignore 壓平。
- **Case 5：Node 22→24 升級後 lockfile／native 依賴**——容器 rebuild 後 `./dev.sh verify` 全綠才算完成；若 Alpine 24 image 有不相容，回報而非硬上。
- **Case 6：刪 compact-app view 欄位時的消費端**——瘦身前先以型別檢查確認無 production 消費者；render 輸出以 AC10 驗證不變。

## ADR

- **ADR-035-1：content 存取抽函式式 content-source module，不做 class-based manager。**
  原因：靜態站 build-time 一次性讀檔，無狀態、無生命週期，符合專案「純函式優先，Class 只管狀態」慣例；單一入口即可消滅五處 published 判定與三套 reader 的分歧。
  替代方案：ORM 風格 ContentManager（過度設計，YAGNI）；只抽 isPublished predicate（reader 分歧的債留著，下次改 schema 仍要改三處）。

- **ADR-035-2：SITE_URL 由既有 `APP_URL` 導出，不新增獨立環境變數。**
  原因：`APP_URL` 已有完整三態機制（.env 開發站、dev.sh verify 與 CI 釘 production），導出即天然獲得開發站/正式站分流；新增 `SITE_URL` env 會出現兩個變數要對齊的新分歧點。
  替代方案：獨立 `NUXT_PUBLIC_SITE_URL`（多一個要同步的變數，違反本 sprint 的收斂初衷）。

- **ADR-035-3：knip 納入 `./dev.sh verify` 鏈作為 dead-code gate。**
  原因：化石清運若無 gate 固化，死碼會再堆積（tag-explorer 即為下架後遺留多個 sprint 的實例）；knip 對 unused files/exports/dependencies 一次覆蓋。
  替代方案：只手動跑（會被遺忘）；ESLint no-unused-vars（只看檔內，抓不到跨檔死 export 與死檔案）。

- **ADR-035-4：承接 025 交棒的三處交界；行為已移除的測試連帶刪除。**
  原因：CLAUDE.md 判準是「行為還在不在」。025（已完成）將三處交界明文交棒 035——back-nav grep（抽 composable 後取代，AC7）、server route wiring grep（行為化，AC2b）、tag-explorer adoption grep（025 已代刪，035 只移元件本體，AC10）。本 sprint 刪除死元件/死欄位時，守護它們的斷言（含 nuxt-smoke 反向斷言、build script 字串釘死）屬正確同步。025 執行後其餘 source-grep 存量（如 `public-discovery.test.ts` 的 perf/wiring documented residual）不在本 sprint 範圍，除非本 sprint 的收斂直接動到其守護的行為。
  修正 025 works 事實：works M5 記「detail route handler 無 invocation 測」與現況不符——`tests/server/detail-route-handler.test.ts`（028 產物）已真 invoke handler 斷言 200/404，故 detail route 的 wiring grep 屬純冗餘可直接刪，只有 content.json／search-index.json 兩 route 需補 handler test（AC2b）。
  替代方案：全部留給 025（順序死鎖，025 的刪除工作紅燈無法收斂）。

- **ADR-035-5：generate/build 缺 `APP_URL` 由靜默 fallback 改為硬失敗（行為變更）。**
  原因：現況 guard（`nuxt.config.ts:12-15`）豁免 generate/build 並 fallback `dwselect.toybox.local`——缺 env 的 generate 會靜默產出錯誤 host 的 SEO/canonical/discovery artifact，正是 Case 2 明令禁止的行為。三條正規路徑（`.env` 開發、`dev.sh verify`、CI job env）均恆供 `APP_URL`，硬失敗只擋「裸跑 `nuxt generate`」的路徑，而那正是要擋的。
  Tradeoff：依賴 toybox fallback 的本機裸跑 generate 流程會開始失敗，需改帶 `.env` 或明確 env——可接受，屬 fail-loud 的預期效果。
  替代方案：維持 fallback（靜默產錯 host，違反 AC4/Case 2）；只在 scripts 端檢查（nuxt.config 這條路漏網）。

- **ADR-035-6：Google Sheets guard 三件組退役，須與 CI step 原子同步。**
  原因：guard（`scripts/assert-runtime-google-sheet-clean.ts`＋`tests/runtime-google-sheet.test.ts`＋`static-generate.yml` 的獨立 step）守的是早已完成的 Sheets→Git-backed 遷移，重新引入風險屬歷史性；使用者於技術債審查裁示退役，2026-07-07 xreview 後複核維持。退役必須三件於**同一 commit 原子移除**——xreview 抓到 `static-generate.yml:62` 仍呼叫該 script，只刪 script 不刪 workflow step 會令 CI 直接紅。
  替代方案：保留 guard（成本雖低，但守的威脅已不存在，違反本 sprint 化石清運宗旨）；退役但另建替代掃描 gate（為歷史性風險建新 gate，YAGNI）。

## Milestones

### Milestone 1: 化石清運
> 範圍：`tag-explorer.vue`＋專屬 CSS、`format-published-date.ts`、compact-app view 瘦身、search-index legacy union、搜尋歷史直寫軌、殘留 `build` script、Google Sheets guard 三件組退役（script＋測試＋`static-generate.yml:62` CI step 同一 commit 原子移除，ADR-035-6）、migration scripts 移 legacy 並退出預設測試集、`toybox-local-root-ca.crt` gitignore
> 驗證：`pnpm test`／`pnpm typecheck` 全綠；首頁、guide、links、search 頁面實開確認渲染不變
> 預期結果：AC10、AC11 達成；後續 milestone 的重構面積縮小

- [x] Red → Green → Refactor

### Milestone 2: content-source module
> 範圍：`isPublished` 抽為 `app/utils/content/` browser-safe 純 predicate（client/Node 共用，不得連帶 node:fs）；新建 `scripts/content-source/` 收斂三套 reader 與 `PublicTaxonomies` 重複型別；既知 inline published 判定全數改接（build scripts、`build-navigation.ts` L23/L87、search-index 三處 filter），動工前全域掃 `status === 'published'` 補全清單；search-index guide image resolver 刪重複；消費端（build scripts、server routes、search index）改接；連帶把 025 交棒的 server route wiring 守門行為化（AC2b）——補 content.json／search-index.json 兩 route 的 handler-invocation 測試後，移除 `server-content-routes.test.ts` route 原始碼字串斷言與 `detail-route-id-resolution.test.ts` it #1
> 驗證：AC1 的 draft/published fixture 行為測試；AC2b handler 測試紅→綠；`pnpm test`＋`pnpm generate` 全綠
> 預期結果：AC1、AC2、AC2b、AC3 達成

- [x] Red → Green → Refactor

### Milestone 3: 站台 URL/名稱 env 化
> 範圍：`getSiteUrl()` 單一來源接 `APP_URL`（呼叫時檢查，不 module top-level eager throw）；nuxt.config guard 移除 generate/build 豁免與 `vite_host` toybox fallback（ADR-035-5）；app 端 SITE_URL 經 Nuxt 設定烤入（runtimeConfig 或 build-time 常數，實作時擇定並記入 works）；`seo-metadata.ts`、`public-content.ts`、`public-content-payload.ts` literal type、og-image 改接；相關測試改以 env 注入驗證
> 驗證：AC4 換 APP_URL 重 generate 比對 resolved 值；AC5 缺 env fail-loud 測試
> 預期結果：AC4、AC5、AC6 達成（vitest 層行為已驗；generate SSR prerender 端到端輸出與缺 env 中止碼待 CI 驗——define 未觸達 SSR 時 failOnError 會立即暴露）

- [x] Red → Green → Refactor

### Milestone 4: detail 共用 composable 與元件
> 範圍：`useDetailBackNavigation`、`useBrokenImageFallback`、`related-products-section.vue`、順帶收斂 route id 正規化 helper（4 處）與並列陣列配對 helper；product/guide detail、resource-list 改接；取代 025 續留的 back-nav source-grep（AC7）
> 驗證：composable 層行為測試（含 Case 3）；既有 back-navigation 測試收斂為一份；頁面實開確認返回行為與破圖 fallback；**保持 025 新增的 `product-detail-page-head.test.ts`（useHead 早於 await 守門）續綠**——抽 composable 若動 `products/[id].vue` setup 結構，head/SEO meta 註冊須仍早於資料 await
> 預期結果：AC7、AC8、AC9 達成

- [x] Red → Green → Refactor

### Milestone 5: knip 導入
> 範圍：knip devDependency＋設定（Nuxt entry 宣告）、`pnpm knip` script、接入 `dev.sh verify` 鏈與 CI
> 驗證：AC12——baseline 零報告；注入假死碼時非零碼失敗；`./dev.sh exec ./dev.sh verify` 全綠
> 預期結果：AC12 達成，dead-code gate 固化
> ✅ M5 完成（可跑容器＋knip 的環境）：knip 6.25.0 裝妥、`knip.json`＋`cmd_knip`＋verify 鏈＋CI 齊備、host/CI/容器三環境零報告、probe 攔截驗證通過。容器缺口（Case 4 誤報）根因為 knip 寫死讀 `.nuxt` manifest、build-mode 產出不含 component 註冊，以 `cmd_knip` 容器分支補 `nuxt prepare` 解決。

- [x] Red → Green → Refactor

### Milestone 6: 環境一致性與小項
> 範圍：Dockerfile node 24＋`--frozen-lockfile`、`vitest.config.ts` 排除 `tests/e2e/**`、package name、`content-markdown` heading level、CTA token 化（含必要的 `--dw-on-accent`）、scripts 小重複（`getOptionValue`×3、`isMissingFileError`×2、CLI entry guard×3）收成 `scripts/cli-helpers.ts`、`dev.sh:175` 註解與 workflow 冗餘 `DWSELECT_ALLOW_HOST_GENERATE` 收斂
> 驗證：容器 rebuild 後 `./dev.sh exec ./dev.sh verify` 全綠（AC13）；AC14 vitest 直跑；AC15 render 測試；AC16 兩主題實開檢查
> 預期結果：AC13–AC17 達成（AC14/AC15 完整驗收；AC13 容器 rebuild verify、AC16 兩主題開頁驗色、AC17 容器 rebuild／frozen-lockfile build 驗證交棒 CI/使用者）

- [x] Red → Green → Refactor
