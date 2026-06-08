import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

import { buildProductRoutes } from './scripts/build-product-routes'

const product_routes = buildProductRoutes(fileURLToPath(new URL('./content/products/', import.meta.url)))

export default defineNuxtConfig({
  compatibilityDate: '2026-06-05',
  modules: ['@nuxt/content', '@nuxt/ui'],
  css: ['~/assets/styles/main.css'],
  experimental: {
    viewTransition: true,
  },
  vite: {
    server: {
      allowedHosts: ['dwselect.toybox.local'],
    },
  },
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
})
