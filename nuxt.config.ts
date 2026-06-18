import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

import { buildProductRoutes } from './scripts/build-product-routes'

const app_url = process.env.APP_URL
if (!app_url && !process.argv.some((a) => a === 'generate' || a === 'build')) {
  throw new Error('APP_URL 環境變數未設定——請在 .env 設定，例如 APP_URL=dwselect.toybox.local')
}
const vite_host = app_url ?? 'dwselect.toybox.local'

const product_routes = buildProductRoutes(fileURLToPath(new URL('./content/products/', import.meta.url)))
const google_tag_manager_script = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KTZKC8CH')`
const google_tag_manager_noscript = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KTZKC8CH" height="0" width="0" style="display:none;visibility:hidden"></iframe>'

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
  experimental: {
    viewTransition: false,
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
      ],
    },
  },
  vite: {
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
