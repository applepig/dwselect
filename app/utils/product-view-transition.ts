export type ProductViewTransitionPart = 'card' | 'image' | 'title' | 'summary' | 'price'

const PRODUCT_VIEW_TRANSITION_PREFIX_BY_PART = {
  card: 'product-card',
  image: 'product-image',
  title: 'product-title',
  summary: 'product-summary',
  price: 'product-price',
} satisfies Record<ProductViewTransitionPart, string>

export function getProductViewTransitionName(product_id: string, part: ProductViewTransitionPart): string {
  return `${PRODUCT_VIEW_TRANSITION_PREFIX_BY_PART[part]}-${product_id}`
}

export function getProductViewTransitionStyle(product_id: string, part: ProductViewTransitionPart) {
  return {
    'view-transition-name': getProductViewTransitionName(product_id, part),
  }
}
