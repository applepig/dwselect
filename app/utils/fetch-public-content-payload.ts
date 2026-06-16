import type { PublicContentPayload } from './public-content-payload'

export async function fetchPublicContentPayload(): Promise<PublicContentPayload> {
  if (import.meta.server) {
    const { readFile } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    const content_payload_source = await readFile(resolve(process.cwd(), 'public/api/content.json'), 'utf8')

    return JSON.parse(content_payload_source) as PublicContentPayload
  }

  return await $fetch<PublicContentPayload>('/api/content.json')
}
