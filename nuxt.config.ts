import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-06-05',
  modules: ['@nuxt/content', '@nuxt/ui'],
  css: ['~/assets/styles/main.css'],
  vite: {
    server: {
      allowedHosts: ['dwselect.toybox.local'],
    },
  },
  nitro: {
    preset: 'static',
  },
})
