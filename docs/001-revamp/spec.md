# Spec: DW嚴選 2.0 改版計畫

## 1. 專案目標
在不更動現有資料來源 (Google Sheets TSV) 的前提下，使用現代化前端技術重構「DW嚴選」網站，提升維護性、效能與使用者體驗。

## 2. 技術選型 (Tech Stack)
*   **核心框架**: [Vue 3](https://vuejs.org/) (Composition API) - 輕量、高效，適合互動型列表應用。
*   **建置工具**: [Vite](https://vitejs.dev/) - 極速開發體驗與最佳化打包。
*   **狀態管理**: [Pinia](https://pinia.vuejs.org/) - 簡單直觀的狀態管理。
*   **路由管理**: [Vue Router](https://router.vuejs.org/) - 支援未來的頁面擴充 (如分類頁、詳情頁)。
*   **樣式系統**: **Vanilla CSS** (Scoped) + **CSS Variables**。
    *   不依賴龐大的 CSS Framework (如 Bootstrap/Tailwind)，以保持輕量與高客製化彈性。
    *   建立完整的 Design System (Colors, Typography, Spacing) 變數。
    *   使用 PostCSS 支援 Nesting 等現代語法。
*   **HTTP Client**: Native `fetch` API。

## 3. 功能需求
### 核心功能
*   **資料載入**: 從 Google Sheets TSV 讀取資料。
*   **商品列表**: 網格狀 (Grid) 展示商品卡片。
*   **搜尋功能**: 支援關鍵字搜尋 (名稱、描述、標籤)。
*   **商品詳情**: 彈出式視窗 (Dialog/Modal) 顯示完整資訊。

### 新增/優化功能
*   **進階篩選**:
    *   **分類篩選**: 依據 TSV 中的分類欄位。
    *   **價格排序**: 由高到低 / 由低到高。
    *   **標籤過濾**: 點擊標籤進行篩選。
*   **使用者體驗 (UX)**:
    *   **Skeleton Loading**: 骨架屏載入效果，取代全螢幕遮罩。
    *   **我的最愛 (Wishlist)**: 使用 `localStorage` 儲存感興趣的商品。
    *   **深色模式 (Dark Mode)**: 跟隨系統或手動切換。
    *   **RWD 優化**: 針對行動裝置優化的導覽與篩選介面。

## 4. UI/UX 設計方針
*   **風格**: Modern Minimalist (現代極簡)。
*   **配色**:
    *   主色 (Primary): 延續原本的橘色系 (活力、推坑感)，但進行微調使其更和諧。
    *   背景: 乾淨的白/深灰 (Dark Mode)。
    *   卡片: 輕微的陰影 (Elevation) 與圓角 (Border Radius)。
*   **互動**:
    *   Hover 效果: 卡片上浮、圖片放大。
    *   轉場: 頁面切換與 Modal 開關的平滑動畫。

## 5. 資料結構 (Schema) - Read Only
維持現有 TSV 結構：
*   `name`: 商品名稱
*   `price`: 價格
*   `desc`: 描述
*   `link_url`: 購買連結
*   `img_url`: 圖片連結
*   `tags`: 標籤 (空白分隔)
*   `category`: 分類 (若無則為 "未分類")
*   `reference`: 參考連結

## 6. 專案結構規劃
```
src/
├── assets/        # 靜態資源
├── components/    # Vue 組件 (Card, Modal, SearchBar...)
├── composables/   # 邏輯複用 (useGoogleSheet, useFilter...)
├── stores/        # Pinia 狀態 (products, ui...)
├── styles/        # 全域樣式 (variables.css, reset.css)
├── views/         # 頁面組件 (Home, Favorites...)
├── App.vue        # 根組件
└── main.js        # 入口點
```
