# Hotfix: compact-app 桌面版對齊、link card 版面、VT 閃爍與價錢/tag 配色

035 code-health 收斂後使用者回報的四項可見 UI 缺陷。走 /ddd.fixbug，main agent 直接修。分支 `feat/035-codehealth-consolidation`。

## 問題描述

- **症狀**：
  1. Desktop（≥1200px）product card grid 與 link/guide rows 明顯不對齊。
  2. Link card（resource-list 的 guide/link 列）資訊呈現差：圖片僅 44×44 太小；title/subtitle/meta 三行全 `nowrap` 被 `...` 截斷、summary 無處展開；第三行（單一分類 tag 或 url）獨佔一行浪費。
  3. Product card view transition 動畫種類過雜：分類切換時 channel tag 會消失再 fade in（非整塊滑動）；價錢 tag 切到 detail 時看起來消失。
  4. 首頁的價錢／tag 長相配色與 detail 頁完全沒對齊。
- **預期行為**：
  1. panel 內容欄寬＝header 卡片內文欄寬，product card 與 link 對齊同一欄。
  2. 圖片放大到約 4 行字高；summary 預留至少 2 行、不被截斷。
  3. 分類切換時整張卡整塊滑動、無多餘閃爍；價錢切到 detail 連續 morph。
  4. 首頁與 detail 的價錢／tag 用同一套 --dw token（統一到 detail 語彙：rose 價錢＋amber tag）。
- **影響範圍**：首頁、分類/tag/brand/channel taxonomy 頁、links 頁、search 結果、product detail 頁（compact-app 全域 UI）。

## 根因分析

- **根因**：
  1. **對齊**：≥1200px 的 `.compact-panel` padding-inline 停在 40px，卻靠只給 `.product-grid` 的 `margin-inline: 41px` 補丁硬湊到 header 內文欄（margin 40＋border 1＋padding 40＝81px）；`.resource-list` 沒這條補丁 → 停在 40px。inset 沒有單一真相。對照 768–1199px：那邊 panel padding＝57＝28＋1＋28、product-grid 無 margin hack、全部靠 panel padding 對齊——≥1200 的 grid-only margin 才是脫離模型的異常。
  2. **link card**：`.resource-row` 用 `44px | 1fr | 32px`、media 固定 44×44，且 title/subtitle/meta 共用一條 `white-space: nowrap; text-overflow: ellipsis`。
  3. **VT**：`.product-transition-shell`／image／title／summary／price 皆掛 `view-transition-name`，唯獨 channel badge 沒掛名 → 分類切換（home↔home）時它落入 root snapshot 被 cross-fade（消失再 fade in），其餘具名部件則 morph。價錢首頁用 `variant="accent"`（`--ui-primary` 橘底）、detail 用 `.detail-price`（`--dw-rose`），顏色不連續放大了「morph 到 detail 時消失」的感受。
  4. **配色**：首頁價錢 = accent pill（primary 橘底反白字）、channel = dark pill；detail 價錢 = rose 純文字、taxonomy = default(amber) pill。兩頁各一套語彙。
- **定位過程**：讀 `catalog.css` 三段 media query 的 inset 值反推對齊模型；讀 `product-card.vue`/`product-detail.vue`/`product-view-transition.ts` 對照 card↔detail 的 vt-name 覆蓋範圍，發現 channel 缺名；比對 `map-resource-rows.ts` 確認 link meta=url、guide meta=分類 label。此修正同時收掉 035 M6 works.md 標記的「`.catalog-pill--accent` 用 `--ui-text-inverted` 在 dark 反相」後續 scoped bugfix 候選（price pill 改走 `--dw-rose` token，theme-aware）。
- **受影響的檔案**：
  - `app/assets/styles/catalog.css`
  - `app/components/product-card.vue`
  - `app/components/catalog-pill.vue`
  - `app/utils/product-view-transition.ts`
  - `tests/view-transition.test.ts`（新增行為測試）

## 修復內容

- **修了什麼**：
  1. **對齊**：≥1200px `.compact-panel` padding-inline 40→81px，移除 `.product-grid { margin-inline: 41px }`。與 768–1199px 同模型：panel padding 收 inset、grid 不另加 margin，product card／link rows／taxonomy 區段一致對齊 header 內文欄。**副作用**：detail 頁（用 `.compact-panel` 包裹）也一併對齊到 81px 欄（原貼 40px），需開頁確認觀感。
  2. **link card**：`.resource-row` grid 改 `88px | 1fr | 32px`、`align-items: start`；media 44→88px、fallback icon 24→32px；拆開 title/meta（維持單行截斷）與 summary（`-webkit-line-clamp: 2`、`min-height: 2.9em` 預留 2 行、`overflow-wrap: anywhere` 折行不截斷）；body 改 `display: grid; gap: 5px` 縱向堆疊；action 補 `align-self: center`。
  3. **VT**：`product-view-transition.ts` 新增 `channel` part（`product-channel-{id}`）；channel badge 補 `product-vt-channel` class＋vt-name style；catalog.css 新增 `.product-vt-channel` 與 `::view-transition-group/old/new(.product-channel)` 規則、reduced-motion 停用清單。分類切換時 channel 一起 morph（整塊滑動不再消失再 fade in）。
  4. **配色**：新增 `.catalog-pill--price`（`--dw-rose` 16% 底、rose 字），首頁價錢 `variant="accent"`→`"price"`；channel `variant="dark"`→default(amber)。移除已無引用的 `.catalog-pill--accent`／`.catalog-pill--dark` CSS 與 variant union（改 `'default' | 'price'`）。detail 頁為統一目標、不動。價錢兩頁同走 rose token → morph 顏色連續。
- **測試**：`tests/view-transition.test.ts` 新增行為測試——channel badge 於 render 後帶 `view-transition-name: product-channel-{id}`（先 Red 後 Green）。對齊 padding、link card 圖大小、pill 顏色屬純視覺變更，依 CLAUDE.md 不硬造 unit test，交開頁驗證。
- **驗證結果**：
  - **CI-equivalent 容器 verify（權威）**：`docker compose build`（`--frozen-lockfile` 重裝當前 lock，含 knip）後 `docker compose run --rm --entrypoint bash app -c "nuxt prepare && dev.sh verify"`，**EXIT=0 全綠**：
    - `test`：**595 passed / 86 files**（原 594 → +1 channel VT 行為測試）。
    - `lint`：通過。
    - `knip`：無 unused。
    - `typecheck`（vue-tsc，隔離 buildDir）：無 error TS。
    - `generate`：**Prerendered 544 routes、`.output/public` 產出**。
  - verify 遇錯即止（首次 run 因 `.nuxt` 未 prepare 而停在 test，證明鏈式 abort），能跑完 generate 且 exit 0 ＝每關皆過。
  - **合併後複驗（Dropbox 三方合併把 035.1 併入 `feat/038-public-site-render-perf`，含 036 Disqus/share、038 render-perf）**：同一容器 verify 再跑一次 **EXIT=0**——**661 passed / 96 files**（035.1 的 +1 channel VT 測試在內，其餘增量為 036/038）、typecheck 無 error TS、knip 無 unused、generate **1550 routes**。四項改動無衝突/遺失，且 issue 4／3-2 假設（detail `.detail-price` rose＋共享 `product-vt-price`、taxonomy default pill、channel 未掛 VT 名）與 issue 1 對齊（top-bar ≥1200 仍 margin40+padding40）合併後仍成立。
  - **環境註記**：host 直跑 `CI=true ./dev.sh typecheck` 會掛在 `@vue/language-core` 找不到 `vue-router/volar/sfc-route-blocks`——那是 host node_modules 被 M5 knip 的非 frozen `pnpm install` churn 過的產物，**與本次改動無關**；容器乾淨 frozen 安裝的 vue-tsc 正常。容器啟動的 `su-exec: dev.sh: Permission denied` crash-loop 根因＝host uid 1421 ≠ image node uid 1000＋dev.sh 僅 owner 有 x；驗證改用 `docker compose run --entrypoint bash`（root）繞過 entrypoint 降權。
  - **仍待人眼／截圖驗收（generate 過不代表視覺對）**：對齊觀感（尤其 detail 頁 inset 由 40→81 的側效果）、link card 放大後版面比例、分類切換整塊滑動、價錢 morph 連續、light/dark 兩主題 rose/amber pill 對比。
