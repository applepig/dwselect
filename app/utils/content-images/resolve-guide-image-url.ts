import { resolveImageFileUrl } from './resolve-image-file-url.ts'

type GuideImageSource = {
  image_file?: string | null
  image_url?: string | null
}

export function resolveGuideImageUrl(guide: GuideImageSource): string | null {
  return resolveImageFileUrl(guide.image_file, 'guides')
}
