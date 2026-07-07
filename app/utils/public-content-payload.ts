import type {
  CategoryDefinition,
  ChannelDefinition,
  TagDefinition,
} from './product-schema'
import type {
  CategoryChipView,
  ProductCardView,
} from './public-content-view-types'
import type { CompactResourceRow, CompactSearchTagGroups } from './published-products/types'

export type PublicTaxonomies = {
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags: TagDefinition[]
  brands: TagDefinition[]
}

export type PublicContentPayload = {
  version: 1
  site: {
    // name／url 值來自單一來源（SITE_NAME 常數與 getSiteUrl()）；型別不再重複釘死字面，
    // 避免與 SITE_NAME／APP_URL 導出值形成第二處平行定義（AC6、ADR-035-2）。
    name: string
    url: string
  }
  products: {
    cards: ProductCardView[]
  }
  guides: {
    rows: CompactResourceRow[]
  }
  links: CompactResourceRow[]
  navigation: {
    category_chips: CategoryChipView[]
    desktop_category_items: CategoryChipView[]
    popular_search_tags: CompactSearchTagGroups
    counts: {
      products: number
    }
  }
  taxonomies: PublicTaxonomies
}
