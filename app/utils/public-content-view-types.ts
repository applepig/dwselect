import type { Product, ProductOffer, ProductReferenceLink } from './product-schema'

// 代表「未篩選分類」的哨兵：全部 chip 的 id、首頁 active 判定、route param fallback 皆用它。
// 值為字串 'all'（route param 與 payload chip id 靠此字面），具名引用讓拼錯被型別擋。
export const ALL_CATEGORIES_ID = 'all'

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

export type ProductDetailReferenceLink = Pick<ProductReferenceLink, 'title' | 'url'>

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
  reference_links: ProductDetailReferenceLink[]
  // related 卡與首頁卡同一 mapper 與元件（ADR-036-6），欄位即完整卡型，不另設瘦身型別。
  related_products: ProductCardView[]
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
  related_products: ProductCardView[]
}

export type CategoryChipView = {
  id: Product['category_id'] | typeof ALL_CATEGORIES_ID
  label: string
  count: number
}
