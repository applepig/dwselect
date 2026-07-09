import type { PublicContentPayload, PublicTaxonomies } from '../app/utils/public-content-payload.ts'

export const PUBLIC_CONTENT_VERSION = 1

export type { PublicContentPayload, PublicTaxonomies }

export { buildPublicContentPayload } from './public-payload/build-public-content-payload.ts'
