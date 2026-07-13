# Works: 038 public site render perf

## Milestone 3b: 列表圖片 responsive 尺寸＋首屏 eager

- **技術決策（初版實作，Red → Green → Refactor）**：
  - `product-card.vue` 的 `<NuxtImg>` 補響應式屬性：初版採 @nuxt/image screen-shorthand `sizes="xs:92vw sm:47vw md:31vw lg:25vw xl:260px"`（驅動多寬度 srcset，取代原本單一路徑 1x/2x）＋ `:quality="75"`，保留 `format="webp"` 與 `@error`/fallback 契約。
  - ProductCard 新增最小 API：`eager?: boolean`（`withDefaults` 預設 false）；eager 時 `loading="eager"` 且 `fetchpriority="high"`，否則 `loading="lazy"`。`index.vue` v-for 改 `(product, index)` 並 `:eager="index < FIRST_SCREEN_EAGER_COUNT"`（常數 6，依 iPad 直式首屏約 2 列推估）。其他使用端（taxonomy-page、related-products-section）未傳 eager → 維持 lazy 不變。Case 5（首屏卡片少於 N 張）由 `index < N` 純比較結構保證不越界。
  - `nuxt.config.ts` image 區塊未動——預設 screens 已足以讓 screen-shorthand 產生多寬度 srcset，無需自補 screens/densities（YAGNI）。
  - TDD：先建 `tests/product-card-responsive-image.test.ts` 從公開介面斷言（sizes 多斷點候選、eager→eager+high、預設/明確 false→lazy、eager 破圖 fallback 不回歸），確認 red 後轉 green；既有 product-card-broken-image / use-broken-image-fallback 測試續綠（AC3 不回歸）。
- **xreview（10 條 confirmed findings）與修正**：多條同根因——初版 sizes 依「834px 3 欄」的錯誤前提手調，未對照 `catalog.css` 實際欄寬推導：
  - 主要 findings：iPad 直式 834px 實為 2 欄、卡寬 306px，`md:31vw` 低估目標裝置 LCP 卡圖解析度；sizes 階梯與 auto-fill grid 實際換欄點（~484/716/894/1126/1402px）普遍錯位，多區間過抓或微糊；srcset 上界僅 602w，DPR2–3 手機首屏 LCP 圖被放大 ~1.6–1.8x；五個 breakpoint 產出 10 個過度密集候選，generate 的 IPX 變體與編碼時間放大約 10 倍；同一 sizes 一體套用到 related 96px 縮圖版型造成 2–3 倍過抓；前 6 張全帶 `fetchpriority="high"` 在窄螢幕與真正 LCP 圖搶頻寬；`index.vue` 註解把錯誤欄數標成「M3a 診斷實測」；首頁 eager 接線（`index < N`）零測試覆蓋（spec AC 與 Edge Case 5 的頁面層行為）；測試檔註解宣稱「srcset 烤製由 generate gate 驗證」但該 gate 不存在。
  - 修正核心：以「桌機 auto-fill 欄寬近定值→固定 px、手機單欄→vw」重設策略——sizes 改 `483:92vw 484:340px`，候選收斂為 4 個 {340, 444, 680, 888}，並新增以 @nuxt/image runtime `getSizes` 實跑的 srcset 契約測試鎖住上下界（max ≥800、候選 ≤6，helper：`tests/helpers/resolve-srcset.ts`）；related-products-section 傳專屬 sizes `720:96px 743:30vw 1600:30vw`（ProductCard 新增 `sizes` 覆蓋 prop 作擴充點），手機縮圖改挑 96/192w；`fetchpriority` 從 eager 解耦為獨立 `high_priority` prop，新增 `FIRST_SCREEN_HIGH_PRIORITY_COUNT=1` 僅首張 high、其餘 eager＋預設優先序；新增頁面層測試 `tests/index-first-screen-eager.test.ts`（前 6 張 eager／第 7 起 lazy／僅首張 high／Edge Case 5 卡數<6 不越界）；修正 `index.vue` 註解與 works.md M3a 段傳播的「3 欄」錯誤前提（改 2 欄並附 CSS 推導）；改寫測試檔誤導性註解。
  - 設計 trade-off（已揭露）：桌機單一固定 340px 是 never under-fetch 的折衷（auto-fill 欄寬恆 ~220–335px），代價是最窄欄（~216px）過宣告 ~1.5x——精準逐帶對齊（10 候選）與收斂候選集的內在張力下取後者；related ≥744 用 30vw（候選達 960w），ultra-wide（>1920）3 欄輕微偏軟屬既有現象非本次回歸；high=1 最保守（各版型首列首格恆為 LCP 候選），日後可調常數。
- **問題與解法**：
  - srcset 契約測試以檔案路徑深引入 @nuxt/image dist runtime（package exports 未暴露）；`tests/*.ts` 不在 nuxt typecheck include（僅 `tests/nuxt/**`），不影響 typecheck，已在 helper 註解說明。
  - 未 mount index.vue 全頁（async page＋需 stub 多個 auto-import globals＋Suspense，屬 over-mock 反模式）；頁面層行為改以專屬 eager 接線測試覆蓋（見上，findings 修正後補齊）。
- **測試結果**：
  - 修正後全量：`pnpm test` 95 files／654 tests 全綠；`pnpm typecheck` exit 0；`pnpm lint` exit 0（修正 resolve-srcset.ts 的 `@ts-expect-error` 描述長度後通過）。
  - Gate：容器內 `./dev.sh exec ./dev.sh verify`（test→lint→knip→typecheck→generate）exit 0——generate Client built 19s／Server built 15s、Prerendered 1295 routes，無紅燈。
  - Frontend handoff（dev 站 `https://dwselect.toybox.local/` 實開頁）：首頁 77 張卡——eagerCount=6、img[0] `loading="eager"`＋`fetchpriority="high"`、img[1..5] eager（無 fetchpriority）、img[6] 起 lazy；每張 srcset 4 個寬度候選（340w/444w/680w…，非同 URL 1x/2x）、`sizes="(max-width: 484px) 92vw, 340px"`；img[0] 實載 `/_ipx/w_340&f_webp&q_75/...`，naturalWidth=340 ≈ 顯示寬 306px（遠小於 2560 原圖）；fresh load console error/warning 為 0。詳情頁 breadcrumb／hero／offer CTA／分享／related 3 卡皆正常，related 卡 lazy、捲入視野後實載 w_446 webp；Disqus 未 render 屬 dev 無 shortname 預期行為。截圖：scratchpad/m3b-handoff.png、m3b-detail.png。
  - Handoff 過程附帶發現（非 M3b 引入）：agent-browser `errors` buffer 恆存 15 筆化石錯誤，經三重隔離驗證（`errors --clear` 無效、頁內 listener 計數 0、關舊 tab 不變）為先前 dev session 的 HMR 殘留；工具缺陷是 `errors --clear` 不會清空 buffer，驗證頁面錯誤應改用頁內 listener 或 `console --clear`。
- **待辦／後續候選**：spec M3 明訂的 throttled 實機／Lighthouse 首屏體感複驗仍屬使用者人工驗收項。未 commit／未 stage。

### M3b 擴充：詳情頁 hero 圖 responsive 尺寸（2026-07-12 使用者追加）

- **背景**：M3b 主體 scope 僅列表卡圖，handoff 附帶發現詳情頁 hero 仍載 2560px 原圖（srcset 僅 1x/2x）。使用者追加 spec AC，將 hero 納入同一 responsive 策略。
- **技術決策**：`product-detail.vue` 與 `guide-detail.vue`（本地圖分支）的 hero `<NuxtImg>` 補 `sizes="767:92vw 768:40vw"`（@nuxt/image screen-shorthand，位移後解析為 `(max-width:768px) 92vw, 40vw`）＋ `:quality="75"`＋`fetchpriority="high"`（hero 是詳情頁唯一 LCP 元素，維持預設 eager 並提前抓取）。
  - **sizes 推導**（catalog.css 實地複核 `.detail-hero-layout`）：<768 單欄 hero≈容器全寬（100vw−70px）、768+ 兩欄 `.95fr/1.05fr` → hero≈47.5vw−124px；`.compact-app-shell` 只有 `max-width:100%` 無 px 封頂，故桌機必須用 vw 不能固定 px。候選收斂 4 個 {307, 614, 706, 1412}（≤5），上界 1412 涵蓋手機全寬 DPR3、桌機兩欄 DPR2。
  - **guide 外部圖不沾**：guide 的 `v-else-if` 原生 `<img>`（非 IPX 路徑的外部圖）維持不動，不加任何 responsive 屬性。
- **問題與解法**：retrofit mutation probe 發現 guide 外部破圖測試的 `trigger('error')` 是誤導——happy-dom 下原生 `<img>` 掛載即 `complete && naturalWidth===0`，由 mounted scan 標破圖；改寫該測試為釘「破圖狀態→隱藏＋fallback icon」wiring。
- **測試結果**：新增 `tests/detail-hero-responsive-image.test.ts`（6 條：product／guide 本地 hero 的 sizes/quality/srcset 契約與 eager+fetchpriority、guide 外部圖無 IPX 屬性、破圖 fallback 不回歸）。`pnpm test` 96 files／660 tests 全綠、`pnpm typecheck` exit 0。
- **驗收**：容器內 `./dev.sh exec ./dev.sh generate` 重生產物後，dev 站 product 詳情頁 hero 實測——`sizes="(max-width:768px) 92vw, 40vw"`、srcset 4 候選（307/614/706/1412w）、`fetchpriority="high"`、實載 `/_ipx/w_614&f_webp&q_75/...`（naturalWidth 333，遠小於 2560 原圖）。guide 本地 hero 分支：現有 11 篇 guide 皆無 hero 圖（`has_hero_image` 全 false），無法目視複驗，由 unit 測試涵蓋契約。未 commit／未 stage。

## Milestone 1: Disqus 正體中文

- **技術決策**：在 `app/components/disqus-thread.vue` 的 `createDisqusConfig` 回傳的 config 函式中補上 `this.language = 'zh_TW'`，並在 `DisqusPageConfig` 型別加入 `language: string` 必填欄位（型別層乾淨，無需 `@ts-expect-error` 或 `any`）。config 執行後同時設定 page.url、page.identifier 與 language；A→B 換手時每次 reset 的 config 皆重新產生並帶 zh_TW，既有 owner/token 換手邏輯不受影響。shortname 缺席時行為不變（既有 AC15 測試通過）。
- **TDD 流程**：先在 `tests/disqus-thread.test.ts` 既有兩處 config 斷言（AC13/AC14 首次注入、AC14b A→B 換手）補上 `page.language === 'zh_TW'` 斷言確認 red（expected 'zh_TW' 收到 ''），再改 production code 轉 green。既有 ctx.page 欄位斷言不變。
- **測試結果**：`pnpm test tests/disqus-thread.test.ts` 12 passed（Test Files 1 passed）；`pnpm typecheck` exit 0，無 error/warning。只動上述兩檔，未 commit／未 stage。

## Milestone 3a: 首屏渲染效能診斷（Performance trace 歸屬報告）

- **方法與環境**（2026-07-12）：agent-browser（Chromium headless）對 production `https://dwselect.applepig.net/` 首頁抓 Chrome trace（66k events）＋ resource timing；另以 CDP `Emulation.setCPUThrottlingRate(4)`（近似 iPad 級 CPU）清快取重載量測 paint／LCP／long task。viewport 834×1194。iPad Safari 實機數字會因網路與 WebKit 差異再放大，但主因歸屬不受影響。
- **量化結論（占比歸屬，桌機未 throttle）**：
  - **image 下載＋解碼：最大項**。首屏 11 張圖共 510KB（最大單張 259KB）；`naturalWidth` 2560px 的原圖顯示在 306px 格子（8.4 倍過大）；off-main-thread image decode 合計 **1383ms**；LCP 元素是卡片圖（93KB，nav 後 ~1030ms）。
  - **script／hydration：第二大項**。main thread script 類合計 ~1.5s（含巢狀重複計），其中單一 **496ms** microtask long task＝Vue hydration 一口氣 hydrate 77 張卡；script eval 按 URL 拆分後**最大宗是第三方分析**——GTM/GA4 經 Cloudflare Google tag gateway first-party 路徑 `/w6q7/*` 載入 gtag ≈ **350ms**、Cloudflare Web Analytics `beacon.min.js` ≈ 53ms，Nuxt entry chunk 本體 eval 僅 ~9ms（hydration 工作在 microtask 內另計）。
  - **style／layout：次要**。77 卡 grid 首次 Layout 419ms＋text shaping（`InlineNode::ShapeText`）266ms。
  - **paint／composite：極小（53ms）→ VT compositing 排除為首屏主因**。每卡 5 個 `view-transition-name`（77×5≈385 個）只在換頁快照時付費，首載不付；M3c 的 VT 議題只影響換頁體感，不是本 US 的首屏根因。
- **4x CPU throttle（iPad 近似）重現體感**：FCP 904ms（SSR HTML 直出，首繪本身不慢）→ LCP 1772ms → long task **總計 3.2s**（最大單一 993ms、次大 737ms），main thread 從 FCP 後斷續堵到 ~4.3s。體感「骨架先排好、圖片與內容數秒後才畫出來」＝ **SSR 卡片框架先繪出，隨後 lazy 大圖下載＋解碼被塞爆的 main thread 進一步推遲**，兩因疊加。
- **已排除的其他可能性**：webfont FOIT（production CSS 無 `@font-face`，全 system font）；payload 冗餘（`_payload.json` 現為 64KB，028 拆分已生效）；CSS 體積（單檔 28KB）；TTFB／CDN（0.3–0.4s，HTML 19.7KB gzip）；client-render 空殼（SSR HTML 166KB 含完整卡片內容，FCP <1s 即繪出）。
- **對 M3b／M3c 的導向**：
  - M3b（圖片 `sizes`/`width`/`quality`＋首屏 eager）直接命中最大項：306px 格子配 8.4 倍原圖，responsive srcset 預期把首屏圖流量與解碼成本砍一個數量級；首屏可視 eager 張數依 834px 寬 2 欄 grid（rail 96＋panel padding 114 → container 624，minmax(220,1fr) 3 欄需 ≥894px；實測 306px 格寬即 2 欄）估約 2 欄×3 列＝6 張。
  - M3c 條件觸發成立（script/hydration 為共同主因），提案方向：(a) 卡片 lazy hydration／削減首屏 hydration 範圍；(b) **第三方分析 script 延後**（GTM gateway ~350ms＋beacon 屬 spec 未列的新發現，延到 idle/interaction 載入可還 main thread 近 400ms×iPad 倍率）——納入或延後由 review gate 裁決。
- **量測產物**：trace `scratchpad/m3a-profile.json`、分析腳本 `analyze-trace.mjs`、throttle 腳本 `throttled-run.mjs`（session scratchpad，一次性診斷工具未進 repo）。
