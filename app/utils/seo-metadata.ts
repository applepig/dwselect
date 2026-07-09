import type { MaybeRefOrGetter } from 'vue'

import { SITE_NAME } from './site-name'

// SITE_URL 跟著 APP_URL 環境走（ADR-035-2）：值於 build/generate 時由 Vite `define` 從
// process.env.APP_URL 烤入（nuxt.config／vitest.config 皆注入 __DW_SITE_URL__），
// seo-metadata 維持純函式讀常數、不需 Nuxt setup context，故各頁與工具的呼叫端零改動。
declare const __DW_SITE_URL__: string

export const SITE_URL = __DW_SITE_URL__
export const SITE_DESCRIPTION = '值得買、值得看、值得收藏的選物清單。'
export const SITE_TITLE = `${SITE_NAME}｜值得買、值得看、值得收藏的選物清單`
export const SITE_OG_IMAGE = `${SITE_URL}og-image.png`

export function getCanonicalUrl(path: string): string {
  const normalized_path = path.trim()

  if (normalized_path === '' || normalized_path === '/') {
    return SITE_URL
  }

  return new URL(normalized_path.replace(/^\/+/, ''), SITE_URL).toString()
}

export function getOgImageUrl(image_url: string | null | undefined): string {
  const trimmed = image_url?.trim() ?? ''

  if (trimmed === '') {
    return SITE_OG_IMAGE
  }

  // 已是絕對 URL 的圖片直接用，不經 getCanonicalUrl 重組，避免破壞外部 host
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (/^\/?(?:products|guides)\/images\//.test(trimmed)) {
    return SITE_OG_IMAGE
  }

  return getCanonicalUrl(trimmed)
}

export function getSeoDescription(description: string | null | undefined): string {
  const trimmed_description = description?.trim() ?? ''

  return trimmed_description.length === 0 ? SITE_DESCRIPTION : trimmed_description
}

// 收斂散落各頁逐字複製的 og/twitter useSeoMeta 樣板：把單一 title／description／url／image
// 鋪到 og 與 twitter 對應欄位，固定 twitterCard。純函式只組 object，呼叫端仍自行呼叫 useSeoMeta，
// 守住 SSG prerender 的 head 註冊時機與 head-before-await 不變式（見 ADR-1）。
export type SeoMetaInput = {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  url: MaybeRefOrGetter<string>
  image: MaybeRefOrGetter<string>
  imageAlt?: MaybeRefOrGetter<string>
}

export function buildSeoMeta(input: SeoMetaInput): Parameters<typeof useSeoMeta>[0] {
  // 入參直接 pass-through（不 toValue）：同一 ref／getter 鋪到多欄，由 useSeoMeta 各欄解包，維持 reactivity。
  const meta: Parameters<typeof useSeoMeta>[0] = {
    title: input.title,
    ogTitle: input.title,
    twitterTitle: input.title,
    description: input.description,
    ogDescription: input.description,
    twitterDescription: input.description,
    ogUrl: input.url,
    ogImage: input.image,
    twitterImage: input.image,
    twitterCard: 'summary_large_image',
  }

  if (input.imageAlt === undefined) {
    return meta
  }

  meta.ogImageAlt = input.imageAlt
  meta.twitterImageAlt = input.imageAlt

  return meta
}
