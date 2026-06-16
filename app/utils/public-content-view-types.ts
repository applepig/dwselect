import type { Product, ProductOffer } from './product-schema'

export type ProductCardView = {
  id: string
  name: string
  summary: string
  image_url: string
  category_id: Product['category_id']
  category_label: string
  channel_id: ProductOffer['channel_id']
  channel_label: string
  price_label: string
  tag_labels: string[]
  published_at: string | null
}

export type RelatedProductCardView = {
  id: string
  name: string
  image_url: string
  category_label: string
  channel_label: string
}

export type ProductDetailView = {
  id: string
  name: string
  summary: string
  long_description: string
  llm_description: string
  hero_image_url: string
  hero_alt: string
  category_id: Product['category_id']
  category_label: string
  channel_id: ProductOffer['channel_id']
  channel_label: string
  tag_labels: string[]
  price_label: string
  buy_url: string
  fine_print: string
  related_products: RelatedProductCardView[]
}

export type CategoryChipView = {
  id: Product['category_id'] | 'all'
  label: string
  count: number
}
