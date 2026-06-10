import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

import { buildProductRoutes } from './scripts/build-product-routes'

const product_routes = buildProductRoutes(fileURLToPath(new URL('./content/products/', import.meta.url)))

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/content', '@nuxt/ui'],
  app: {
    pageTransition: {
      name: 'compact-page-fade',
      mode: 'out-in',
      duration: 320,
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
      allowedHosts: ['dwselect.toybox.local'],
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
