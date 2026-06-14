import { resolveImageFileUrl } from './resolve-image-file-url'

type ProductImageSource = {
  image_file?: string | null
  image_url?: string | null
}

export function resolveProductImageUrl(product: ProductImageSource): string {
  const image_url = resolveImageFileUrl(product.image_file, 'products') ?? product.image_url ?? null

  if (image_url === null) {
    throw new Error('Product image source is required')
  }

  return image_url
}
