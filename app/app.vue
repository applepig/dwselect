<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE, SITE_URL } from './utils/seo-metadata'

useHead({
  title: SITE_TITLE,
  htmlAttrs: {
    lang: 'zh-Hant',
  },
  link: [
    {
      key: 'favicon',
      rel: 'icon',
      href: '/favicon.ico',
    },
    {
      key: 'canonical',
      rel: 'canonical',
      href: SITE_URL,
    },
  ],
})

useSeoMeta({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  ogSiteName: SITE_NAME,
  ogTitle: SITE_NAME,
  ogDescription: SITE_DESCRIPTION,
  ogType: 'website',
  ogUrl: SITE_URL,
  ogImage: SITE_OG_IMAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: SITE_NAME,
  twitterDescription: SITE_DESCRIPTION,
  twitterImage: SITE_OG_IMAGE,
})
</script>
