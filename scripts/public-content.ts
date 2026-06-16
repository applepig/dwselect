import type { PublicContentPayload, PublicTaxonomies } from '../app/utils/public-content-payload.ts'

export const PUBLIC_CONTENT_VERSION = 1
export const SITE_NAME = 'DW嚴選'
export const SITE_URL = 'https://dwselect.applepig.net/'

export type { PublicContentPayload, PublicTaxonomies }

export function isPublished(content: { status: string }) {
  return content.status === 'published'
}

export { buildPublicContentPayload } from './public-payload/build-public-content-payload.ts'
