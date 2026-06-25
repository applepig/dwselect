// Why: taxonomy 頁的 SEO meta（title／description／canonical／OG）抽成純函式，供頁面 setup 套用並可單元測試。
// 沿用既有 seo-metadata helper（getCanonicalUrl／getSeoDescription／SITE_NAME／SITE_OG_IMAGE），不另造一套。

import { getCanonicalUrl, getSeoDescription, SITE_NAME, SITE_OG_IMAGE } from '../seo-metadata'
import type { TaxonomyKind } from './select-taxonomy-items'

export type TaxonomyPageSeoInput = {
  taxonomy_kind: TaxonomyKind
  id: string
  label: string
  description: string | null
}

export type TaxonomyPageSeo = {
  title: string
  description: string
  canonical: string
  og_image: string
}

export function buildTaxonomyPageSeo(input: TaxonomyPageSeoInput): TaxonomyPageSeo {
  // description：優先 tag 既有簡介；無簡介時用 label 衍生一句，避免落回站台預設失去主題性。
  const description = getSeoDescription(input.description ?? `瀏覽「${input.label}」主題下的精選商品、指南與連結。`)

  return {
    title: `${input.label}｜${SITE_NAME}`,
    description,
    canonical: getCanonicalUrl(`/${input.taxonomy_kind}/${input.id}`),
    og_image: SITE_OG_IMAGE,
  }
}
