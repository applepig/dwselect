# Nuxt UI 元件採用（P0）

## 目標

把專案中「自刻原生元素 + 手寫 CSS」、但 Nuxt UI v4 已有現成元件的 P0 部分遷移到對應元件，削減 `catalog.css` 的重複樣式，並建立 `app.config.ts` 作為 UI theme 與元件 defaults 的集中設定點。

範圍限定在低風險、語意直接對應的替換，不改動頁面架構與資料流。

## 非目標

- **不做 P1**：`UNavigationMenu`（app-navigation）、`UHeader`（top bar）、`UPageGrid`（product grid）不在本 sprint。
- **不引入 CommandPalette / ContentSearch**：搜尋維持現有「獨立 `/search` 頁面 + static search index」架構，不改成 modal overlay。
- **不動 product card**：`product-card.vue` 的 `UCard` 結構維持。
- **不動 view transition 動畫**：`catalog.css` 的 `compact-page-fade` 與相關動畫保留。
- **不重寫色彩系統**：`variables.css` 已對接 `--ui-*`，維持現狀；`app.config.ts` 是補上設定層，不取代 CSS 變數。
- **不換 icon set**：現有 `i-heroicons-*` 維持，不強制改成 lucide。
- **不順手重構**無關的命名、結構或格式。

## User Story

作為維護者，我想要把重複手刻的 chip／input／empty／callout 換成 Nuxt UI 對應元件，以便減少 `catalog.css` 的重複樣式、讓互動狀態（active／hover／focus／dark mode）由元件統一處理，降低後續維護成本。

### 驗收條件

- [ ] `app.config.ts` 存在，集中定義 UI 色彩 alias（至少 `colors.primary`／`colors.neutral`），且既有 `--ui-primary` 對接不被破壞。（M1 已完成，需納入驗收確認）
- [ ] `search-input.vue` 改用 `UInput`（`icon` 放 leading 放大鏡、`#trailing` slot 放清除／送出鈕），移除自刻 `.search-input-shell` / `.search-input-icon` 結構；既有 `query` prop、`update:query`、`submit`、`clear` 對外契約與組合鍵（composition）行為不變。搜尋欄使用 `type="text"` + `enterkeyhint="search"`，避免瀏覽器 native search clear 與自訂清除鈕重複；行動裝置屬性（`enterkeyhint`、`autocapitalize`、`autocorrect`、`spellcheck`、`autocomplete`）必須保留。`.search-input` 與 `.search-input-actions` 是 Nuxt UI 元件外層寬度與 trailing actions 排版所需 class，保留時不視為 dead CSS。
- [ ] 全站可點 chip 統一改用 `UButton`：涵蓋 `index.vue` 分類 chip、`tag-explorer.vue` tag chip 與清除鈕、`search-idle-panel.vue` 熱門標籤與搜尋歷史。active 狀態以 `variant`／`color` 表達（取代 `.is-active` class），`aria-pressed` 等無障礙語意維持。
- [ ] 四個頁面共 5 處 empty state（`index.vue`、`guide.vue`、`links.vue`、`search.vue` 的 no-results 與 searching）改用 `UEmpty`，移除 `.compact-empty-state`；各處原本的文案維持不變。`.empty-title` 仍被 search 子面板（error / suggestion / idle）使用，保留時需明確確認不是本 sprint 遷移後殘留的 dead CSS。
- [ ] `product-detail.vue` 的 detail callout 改用 `UAlert`，detail 返回鈕改用 `UButton`（`icon` + `variant="ghost"`），移除對應自刻樣式。
- [ ] `catalog.css` 中被上述替換取代的樣式區段一併刪除，確認無殘留的 dead CSS（被替換的 class 在 `app/` 下已無引用）。Nuxt UI 元件仍需要的 layout / affordance class 可保留，例如 `.search-input`、`.search-input-actions`、chip base class（寬度、最小觸控高度、圓角、換行、focus-visible）與 `.empty-title`（search 子面板使用）。
- [ ] 各遷移元件有對應的 Vitest 驗證；`search-input.vue` 必須有 Vue mount component test，覆蓋 `update:query`、`submit`、`clear`、composition guard、清除鈕條件顯示。其他低風險遷移可用現有 source-string 斷言補足結構與 class 清理驗收；`pnpm test` 全綠。
- [ ] **agent-browser 驗收**：實際開啟 `/`、`/guide`、`/links`、`/search`、商品詳情頁，確認 light／dark 兩種模式下視覺與互動（chip 點選、搜尋輸入、空狀態、callout）沒有明顯壞掉，並截圖佐證。

## 相關檔案

- `app.config.ts` — UI theme 與元件 defaults（M1 已建立）
- `app/components/search/search-input.vue` — `UInput` 遷移
- `app/components/search/search-idle-panel.vue` — 熱門標籤 / 搜尋歷史 chip → `UButton`
- `app/components/tag-explorer.vue` — tag chip 與清除鈕 → `UButton`
- `app/pages/index.vue` — 分類 chip → `UButton`；empty state → `UEmpty`
- `app/pages/guide.vue` — empty state → `UEmpty`
- `app/pages/links.vue` — empty state → `UEmpty`
- `app/pages/search.vue` — no-results / searching empty state → `UEmpty`
- `app/components/product-detail.vue` — callout → `UAlert`、返回鈕 → `UButton`
- `app/assets/styles/catalog.css` — 刪除被取代的樣式區段
- `app/assets/styles/variables.css` — 確認 `--ui-*` 對接不被 `app.config.ts` 破壞（原則上不改）

## 介面/資料結構

本 sprint 不涉及網路通訊協定，僅元件 props／emits 契約。要點（皆以實際 source code 查證）：

- **`search-input.vue` 對外契約不變**：`query` prop、`update:query`、`@submit`、`@clear`。內部改用 `UInput`；`UInput` 自身以 `:model-value="query"` / `@update:model-value` 串接，再轉 emit 為既有 `update:query`：
  ```vue
  <UInput :model-value="query" icon="i-lucide-search" type="text"
          enterkeyhint="search" autocapitalize="off" autocorrect="off" spellcheck="false"
          autocomplete="off" class="search-input">
    <template #trailing>
      <div class="search-input-actions">
        <UButton v-if="has_query" icon="i-lucide-x" color="neutral" variant="ghost" @click="..." />
        <UButton icon="i-lucide-arrow-right" color="primary" @click="..." />
      </div>
    </template>
  </UInput>
  ```
  > 已查證 Nuxt UI v4 `Input.vue`：`inheritAttrs: false` + 內層 `<input>` 有 `v-bind="{...$attrs}"`，故 `enterkeyhint`/`autocapitalize`/`autocorrect`/`spellcheck` 會 forward；`autocomplete` 是 prop，需顯式給。實測 `type="search"` 會出現瀏覽器 native clear 與自訂清除鈕重複，因此決策改用 `type="text"` 搭配 `enterkeyhint="search"` 保留手機鍵盤搜尋鍵。
- **chip → `UButton` 慣例**：active 用 `variant="solid"`、inactive 用 `variant="subtle"`（或以 `color` 區分）；count 數字以 `#trailing` slot 或 `UBadge` 呈現。三處 chip 採同一組 variant 慣例。`aria-pressed` 以 attrs 傳入（UButton 不會自動補 toggle 語意）。
- **`UEmpty` 用法**：`<UEmpty :title="文案" />`（或 `icon` + `title`），文案沿用現有字串。

## 邊界案例

- **Case 1 — active 視覺退化**：chip 從 `.is-active` 改 `variant` 後，選中狀態在 light／dark 必須仍清楚可辨；測試需驗證 selected prop → 對應 variant。
- **Case 2 — 組合鍵輸入**：`UInput` 換掉原生 `<input>` 後，中文 composition（注音／拼音）輸入過程不可觸發誤搜；既有 `tests/search-input-composition.test.ts` 必須持續通過（mount/stub 細節可調整，但「composition 中不 emit submit」的驗收意圖不可放寬）。
- **Case 3 — 空字串 / 清除**：搜尋框清除鈕僅在有非空白輸入時顯示；`UInput` `#trailing` 的條件 render 行為與原本一致，且不得與瀏覽器 native clear 形成雙重清除鈕。
- **Case 4 — empty 與 loading 區分**：`search.vue` 的「搜尋中」與「無結果」是兩個不同狀態，遷移 `UEmpty` 後不可混用同一文案／圖示。
- **Case 5 — dead CSS 殘留**：刪 `catalog.css` 區段時，需確認沒有其他頁面仍引用同名 class（`.tag-chip` 同時被多個元件使用，必須全部遷移後才刪）。若 class 仍承擔 layout、觸控尺寸、focus-visible 或子面板樣式用途（例如 `.search-input`、`.search-input-actions`、chip base class、`.empty-title`），需在測試或文件說明其用途，不能誤判為 dead CSS。
- **Case 6 — `app.config.ts` 與 CSS 變數衝突**：新增 config 後 `--ui-primary` 等對接不可失效，dark mode 切換仍正常。

## ADR（Architecture Decision Record）

- **決策：可點 chip 用 `UButton`，不用 `UBadge` 或 `UChip`。**
  - 原因：chip 是可互動、有 active 狀態的控制項，語意上是 button；`UButton` 原生支援 `variant`／`color`／`disabled`／focus ring／鍵盤無障礙。
  - 替代方案：`UBadge as="button"`（badge 語意偏「標示」非「操作」）；`UChip`（v4 的 `UChip` 是通知小圓點 overlay，非可點 tag）。

- **決策：搜尋維持獨立頁面架構，不引入 `UCommandPalette` / `UContentSearch`。**
  - 原因：現有搜尋是獨立 `/search` 頁 + 自刻 static index，可正常運作；CommandPalette 是 modal overlay 形式，非 drop-in 替換，超出 P0 範圍。

- **決策：新增 `app.config.ts` 作為 UI 設定層，保留 `variables.css` 的 `--ui-*` 對接。**
  - 原因：沒有 config 層時元件外觀只能逐處傳 prop 或改 CSS；config 提供 color alias 與元件 defaults 的單一來源。`primary: 'orange'` 與既有 `#ec7a2b` 同色系；`variables.css` 在 `@nuxt/ui` 之後 import，直接覆寫 `--ui-primary`，故最終主色仍為專案橘色。

## Milestones

### Milestone 1: app.config.ts 設定層 ✅（已完成，需驗收）
> 範圍：`app.config.ts`、`tests/app-config.test.ts`
> 驗證：`pnpm test` 通過；主色仍為橘色（需 agent-browser 確認）
> 預期結果：集中的 UI 設定點，`colors.primary: 'orange'`、`colors.neutral: 'stone'`

- [x] Red → Green → Refactor

### Milestone 2: search-input.vue → UInput
> 範圍：`search-input.vue`；`catalog.css` 的 `.search-input-*` 區段
> 驗證：`tests/search-input-composition.test.ts` 持續通過 + `tests/search-input-component.test.ts` mount 驗證 emit、清除鈕條件顯示與 composition guard；agent-browser 在 `/search` 輸入中文驗證 composition
> 預期結果：搜尋框由 `UInput` 呈現，對外契約與組合鍵行為不變，自刻 shell CSS 移除

- [x] Red → Green → Refactor

### Milestone 3: chip 統一 → UButton
> 範圍：`index.vue` 分類 chip、`tag-explorer.vue`、`search-idle-panel.vue`；`catalog.css` 的 `.category-chip` / `.tag-chip` / `.chip-count` / `.tag-count` / `.clear-tags-button` 區段
> 驗證：Vitest source-string 驗證 `UButton`、active prop → variant、count 顯示、aria-pressed；agent-browser 點選驗證 light／dark active 視覺
> 預期結果：三處 chip 共用同一組 `UButton` variant 慣例，`.is-active` 手寫樣式移除

- [x] Red → Green → Refactor

### Milestone 4: empty states → UEmpty
> 範圍：`index.vue`、`guide.vue`、`links.vue`、`search.vue`（no-results + searching）；`catalog.css` 的 `.compact-empty-state` / `.empty-title`
> 驗證：Vitest source-string 驗證各狀態文案、no-results 與 searching 不混用；agent-browser 開四頁確認空狀態
> 預期結果：5 處 empty state 由 `UEmpty` 呈現，文案不變，自刻樣式移除

- [x] Red → Green → Refactor

### Milestone 5: product-detail callout + 返回鈕
> 範圍：`product-detail.vue`；`catalog.css` 的 `.detail-callout*` / `.detail-back-button` 區段
> 驗證：Vitest source-string 驗證 callout 條件 render、返回鈕觸發 `router.back()`；agent-browser 開商品詳情頁確認
> 預期結果：callout 由 `UAlert`、返回鈕由 `UButton` 呈現，自刻樣式移除

- [x] Red → Green → Refactor

### Milestone 6: catalog.css 清理與收尾
> 範圍：`catalog.css` 全檔；確認 `app/` 下無殘留引用
> 驗證：`rg` 掃描被刪 class 名稱在 `app/` 下無引用；`pnpm generate` 成功；agent-browser 全頁人工檢查
> 預期結果：dead CSS 清除，全站視覺在 light／dark 正常

- [x] Red → Green → Refactor

## 前置條件與風險

- **分支起點**：S13 已 commit 於 `81c2985`，工作區僅有 untracked 的 `app.config.ts`、`tests/app-config.test.ts`（M1 產出）。從目前 commit 開 `feat/014-nuxt-ui-component-adoption` 分支，untracked 檔案會一併帶入，屬正常。
- **元件預設樣式落差**：Nuxt UI 元件預設外觀可能與現有手刻視覺有差異（圓角、間距、陰影），需靠 `app.config.ts` defaults 或 `:ui` prop 微調，agent-browser 階段逐頁確認。
- **UButton 預設 type 未完全查實**：模板兩分支皆傳 `:type="props.type"`，但 `withDefaults` 為空、default 在型別定義層未確認。chip 與 icon button 實作時應顯式確認 render 出的 `type`（避免在 form 內誤觸發 submit）。
