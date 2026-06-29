import type { Product, ProductOffer } from './product-schema'

export type ProductCardView = {
  id: string
  name: string
  summary: string
  image_url: string
  category_id: Product['category_id']
  category_label: string
  channel_id: ProductOffer['channel_id']
  // channel_ids 供 channel alias 頁以「任一 offer 的 channel」精準篩選卡片（含非 primary offer，ADR-9）。
  channel_ids: ProductOffer['channel_id'][]
  channel_label: string
  price_label: string
  // tag_ids 供 taxonomy 頁以 tag 精準篩選卡片（card 上仍以 tag_labels 顯示）。
  tag_ids: string[]
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
  // tag_ids／brand_ids 互斥：brand id（如 panasonic）走 /brand/{id} 專屬前綴，
  // 其餘 tag id 走 /tag/{id}，避免 brand pill 指向不再生成的 /tag/{brand} 死路由（AC24b、ADR-8）。
  tag_ids: string[]
  tag_labels: string[]
  brand_ids: string[]
  brand_labels: string[]
  price_label: string
  buy_url: string
  fine_print: string
  related_products: RelatedProductCardView[]
}

export type GuideDetailView = {
  id: string
  title: string
  summary: string
  body: string
  hero_image_url: string
  hero_alt: string
  category_ids: string[]
  category_labels: string[]
  // tag_ids／brand_ids 互斥：brand id 走 /brand/{id}、其餘 tag id 走 /tag/{id}（AC24b、ADR-8）。
  tag_ids: string[]
  tag_labels: string[]
  brand_ids: string[]
  brand_labels: string[]
  source_url: string
  related_products: RelatedProductCardView[]
}

export type CategoryChipView = {
  id: Product['category_id'] | 'all'
  label: string
  count: number
}
