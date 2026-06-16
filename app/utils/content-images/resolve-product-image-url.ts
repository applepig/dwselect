import { resolveImageFileUrl } from './resolve-image-file-url'

type ProductImageSource = {
  image_file?: string | null
}

export function resolveProductImageUrl(product: ProductImageSource): string {
  const image_url = resolveImageFileUrl(product.image_file, 'products')

  if (image_url === null) {
    throw new Error('Published product image_file is required')
  }

  return image_url
}
