import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

import { buildBrandRoutes } from './scripts/build-brand-routes'
import { buildCategoryRoutes } from './scripts/build-category-routes'
import { buildChannelRoutes } from './scripts/build-channel-routes'
import { buildGuideRoutes } from './scripts/build-guide-routes'
import { buildProductRoutes } from './scripts/build-product-routes'
import { buildTagRoutes } from './scripts/build-tag-routes'

const app_url = process.env.APP_URL
if (!app_url && !process.argv.some((a) => a === 'generate' || a === 'build')) {
  throw new Error('APP_URL 環境變數未設定——請在 .env 設定，例如 APP_URL=dwselect.toybox.local')
}
const vite_host = app_url ?? 'dwselect.toybox.local'

// 029：buildDir / Vite cacheDir 可由環境變數覆寫，讓本機/容器的一次性 build（typecheck/generate/build）
// 與常駐 dev 的 .nuxt 隔離、互不踩 chunk hash；未設時維持 Nuxt 預設，dev 行為零影響。
// 何時注入哪個值由 dev.sh 的三態分流負責（容器內隔離、CI 預設、host 引導進容器）。
const build_dir = process.env.NUXT_BUILD_DIR || '.nuxt'
const vite_cache_dir = process.env.VITE_CACHE_DIR || 'node_modules/.cache/vite'

const product_routes = buildProductRoutes(fileURLToPath(new URL('./content/products/', import.meta.url)))
const guide_routes = buildGuideRoutes(fileURLToPath(new URL('./content/guides/', import.meta.url)))
const taxonomy_content_dirs = {
  products_dir: fileURLToPath(new URL('./content/products/', import.meta.url)),
  guides_dir: fileURLToPath(new URL('./content/guides/', import.meta.url)),
  links_dir: fileURLToPath(new URL('./content/links/', import.meta.url)),
  taxonomies_dir: fileURLToPath(new URL('./content/taxonomies/', import.meta.url)),
}
const category_routes = buildCategoryRoutes(taxonomy_content_dirs)
const tag_routes = buildTagRoutes(taxonomy_content_dirs)
const brand_routes = buildBrandRoutes(taxonomy_content_dirs)
const channel_routes = buildChannelRoutes(taxonomy_content_dirs)
// 028 拆分：每筆 published detail 頁都要對應 prerender 出一份 per-id detail JSON。
// 沿用 detail 頁 route builder（published-only 同源），把 /products/{id} → /api/products/{id}.json，
// 確保 detail JSON 與 detail 頁同進退，generate 不會漏產（failOnError 維持有效）。
const product_detail_json_routes = product_routes.map((route) => `/api${route}.json`)
const guide_detail_json_routes = guide_routes.map((route) => `/api${route.replace('/guide/', '/guides/')}.json`)
// 監看 content/ 目錄絕對路徑而非 glob：Vite 7 的 chokidar 5 已移除 glob 支援，
// 傳 'content/**/*.json' 進 watcher.add() 不會匹配任何檔案。
const content_watch_paths = [fileURLToPath(new URL('./content/', import.meta.url))]
const google_tag_manager_script = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KTZKC8CH')`
const google_tag_manager_noscript = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KTZKC8CH" height="0" width="0" style="display:none;visibility:hidden"></iframe>'

// View Transition feature flag 的單一真相：同一個常數同時餵給 experimental.viewTransition（Nuxt 內建 VT）
// 與 appConfig.enableViewTransition（client middleware 讀取），避免兩處 flag drift（AC2）。
// 用 appConfig 而非 runtimeConfig.public：後者會被 NUXT_PUBLIC_* env 於 build/generate 時單邊覆寫，
// 但 experimental.viewTransition 是 build-time only、永不吃 env——兩者 override 機制不對稱，
// 設 NUXT_PUBLIC_ENABLE_VIEW_TRANSITION=false 會讓 middleware 停關 Vue transition 而 VT 仍接手、雙動畫互打復活。
// appConfig 為 build-time 烤入、非 env-overridable，與 experimental 真正同源不可分歧。
// AC10 gate 未 PASS 前若需 revert，只改這一個常數，experimental 與 disable-vue-transitions middleware 一起進退。
const ENABLE_VIEW_TRANSITION = true

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image'],
  app: {
    pageTransition: {
      name: 'compact-page-fade',
      mode: 'out-in',
      duration: 320,
    },
    head: {
      script: [
        {
          innerHTML: google_tag_manager_script,
        },
      ],
      noscript: [
        {
          innerHTML: google_tag_manager_noscript,
          tagPosition: 'bodyOpen',
        },
      ],
    },
  },
  css: ['~/assets/styles/main.css'],
  colorMode: {
    storage: 'cookie',
  },
  ui: {
    fonts: false,
  },
  appConfig: {
    // client middleware（disable-vue-transitions.global）只讀此值判斷是否把換頁交給 VT；
    // 與 experimental.viewTransition 同步自 ENABLE_VIEW_TRANSITION，非 env-overridable（見上方常數註解）。
    enableViewTransition: ENABLE_VIEW_TRANSITION,
  },
  buildDir: build_dir,
  experimental: {
    viewTransition: ENABLE_VIEW_TRANSITION,
    // ADR-3：<NuxtLink> 全站預設 hover/focus 才預抓，消除「進站即背景狂 prefetch 全部站內 payload／chunk」的冗餘流量；
    // 保留「點擊前已預載」的換頁順暢感（非全關 prefetch）。
    defaults: {
      nuxtLink: {
        prefetchOn: { interaction: true, visibility: false },
      },
    },
  },
  compatibilityDate: '2026-06-05',
  nitro: {
    preset: 'static',
    prerender: {
      // failOnError：任一 prerender route（含 /api/content.json、/search-index.json、product detail）
      // 失敗時讓 nuxt generate 以非零碼中止，避免壞 content／壞 route 靜默產出殘缺 static 站（spec Case 1）。
      failOnError: true,
      routes: [
        '/',
        '/guide',
        '/search',
        '/links',
        '/api/content.json',
        '/search-index.json',
        ...product_routes,
        ...guide_routes,
        ...category_routes,
        ...tag_routes,
        ...brand_routes,
        ...channel_routes,
        ...product_detail_json_routes,
        ...guide_detail_json_routes,
      ],
    },
  },
  vite: {
    cacheDir: vite_cache_dir,
    plugins: [
      {
        name: 'dwselect-content-hmr',
        configureServer(server) {
          server.watcher.add(content_watch_paths)

          const notifyContentUpdated = (file_path: string) => {
            if (!file_path.includes('/content/') && !file_path.startsWith('content/')) {
              return
            }

            server.ws.send({
              type: 'custom',
              event: 'dwselect:content-updated',
              data: { path: file_path },
            })
          }

          server.watcher.on('add', notifyContentUpdated)
          server.watcher.on('change', notifyContentUpdated)
          server.watcher.on('unlink', notifyContentUpdated)
        },
      },
    ],
    server: {
      allowedHosts: [vite_host],
      hmr: {
        protocol: 'wss',
        host: vite_host,
        clientPort: 443,
      },
    },
  },
  eslint: {
    config: {
      stylistic: {
        indent: 2,
        quotes: 'single',
        semi: false,
        commaDangle: 'always-multiline',
      },
    },
  },
  image: {
    // image.dir 由 @nuxt/image 以 resolve(srcDir, dir) 解析；Nuxt 4 srcDir 預設為 app/，
    // 因此用 '../content' 指向專案根目錄的 content/，讓 <NuxtImg> 的 /{domain}/images/{file}
    // src 對應到 content 來源檔（dev 用 IPX 即時最佳化，generate 輸出到 .output/public/_ipx）。
    dir: '../content',
  },
})
