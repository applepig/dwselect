// Why: taxonomy 頁需要「給定 taxonomy id + 型別，跨 product/guide/link 取出該主題下的 published 項目」。
// 輸入刻意要求帶 taxonomy ids（product 單數 category_id、guide/link 複數 category_ids、三者皆 tag_ids），
// 而非僅含 label 的舊 payload——label 非唯一鍵、無法精準對位 taxonomy。
// 純函式、不過濾 status：呼叫端負責先傳入 published-only 清單（與 build-navigation 同源語義）。

export type TaxonomyProductItem = {
  category_id: string
  tag_ids: string[]
  // channel_ids 自 product offers 的 channel_id 抽取（所有 offer，非僅 primary），供 channel alias 頁過濾。
  channel_ids: string[]
}

export type TaxonomyResourceItem = {
  category_ids: string[]
  tag_ids: string[]
}

export type TaxonomyItemsSource<
  P extends TaxonomyProductItem = TaxonomyProductItem,
  G extends TaxonomyResourceItem = TaxonomyResourceItem,
  L extends TaxonomyResourceItem = TaxonomyResourceItem,
> = {
  products: P[]
  guides: G[]
  links: L[]
}

// brand 為 tag 的 alias mode（共用 tag_ids predicate，ADR-8）；channel 以 product offers 的 channel_id 過濾，
// guides/links 無購買連結，恆空（products-only，ADR-9）。
export type TaxonomyKind = 'category' | 'tag' | 'brand' | 'channel'

export type TaxonomySelector = {
  kind: TaxonomyKind
  id: string
}

export type SelectedTaxonomyItems<P, G, L> = {
  products: P[]
  guides: G[]
  links: L[]
}

export function selectPublishedTaxonomyItems<
  P extends TaxonomyProductItem,
  G extends TaxonomyResourceItem,
  L extends TaxonomyResourceItem,
>(source: TaxonomyItemsSource<P, G, L>, selector: TaxonomySelector): SelectedTaxonomyItems<P, G, L> {
  // channel 只關聯 products（offers 的 channel_id）；guide/link 無購買連結，恆空（ADR-9）。
  if (selector.kind === 'channel') {
    return {
      products: source.products.filter((product) => product.channel_ids.includes(selector.id)),
      guides: [],
      links: [],
    }
  }

  // brand 與 tag 共用 tag_ids namespace 與 membership predicate（ADR-8）。
  if (selector.kind === 'tag' || selector.kind === 'brand') {
    return {
      products: source.products.filter((product) => product.tag_ids.includes(selector.id)),
      guides: source.guides.filter((guide) => guide.tag_ids.includes(selector.id)),
      links: source.links.filter((link) => link.tag_ids.includes(selector.id)),
    }
  }

  return {
    products: source.products.filter((product) => product.category_id === selector.id),
    guides: source.guides.filter((guide) => guide.category_ids.includes(selector.id)),
    links: source.links.filter((link) => link.category_ids.includes(selector.id)),
  }
}
