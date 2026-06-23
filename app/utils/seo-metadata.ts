export const SITE_URL = 'https://dwselect.applepig.net/'
export const SITE_NAME = 'DW嚴選'
export const SITE_DESCRIPTION = '值得買、值得看、值得收藏的選物清單。'
export const SITE_TITLE = `${SITE_NAME}｜值得買、值得看、值得收藏的選物清單`
export const SITE_OG_IMAGE = 'https://dwselect.applepig.net/og-image.png'

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

  return getCanonicalUrl(trimmed)
}

export function getSeoDescription(description: string | null | undefined): string {
  const trimmed_description = description?.trim() ?? ''

  return trimmed_description.length === 0 ? SITE_DESCRIPTION : trimmed_description
}
