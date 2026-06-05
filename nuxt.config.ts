import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-06-05',
  modules: ['@nuxt/content'],
  css: ['~/assets/styles/main.css'],
  nitro: {
    preset: 'static',
  },
})
