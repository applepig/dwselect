import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

import { buildProductRoutes } from './scripts/build-product-routes'

const product_routes = buildProductRoutes(fileURLToPath(new URL('./content/products/', import.meta.url)))
const google_tag_manager_script = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KTZKC8CH')`
const google_tag_manager_noscript = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KTZKC8CH" height="0" width="0" style="display:none;visibility:hidden"></iframe>'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/content', '@nuxt/ui'],
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
  experimental: {
    viewTransition: false,
  },
  compatibilityDate: '2026-06-05',
  nitro: {
    preset: 'static',
    publicAssets: [
      {
        dir: fileURLToPath(new URL('./content/products/images/', import.meta.url)),
        baseURL: '/images/products',
      },
      {
        dir: fileURLToPath(new URL('./content/guides/images/', import.meta.url)),
        baseURL: '/images/guides',
      },
    ],
    prerender: {
      routes: [
        '/',
        '/guide',
        '/search',
        '/links',
        ...product_routes,
      ],
    },
  },
  vite: {
    server: {
      allowedHosts: [process.env.APP_URL ?? 'localhost'],
      hmr: {
        protocol: 'wss',
        host: process.env.APP_URL,
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
})
