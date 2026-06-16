import type { Product, ProductOffer } from '../product-schema'

export function getPrimaryOffer(product: Product): ProductOffer {
  return product.offers[0]!
}
