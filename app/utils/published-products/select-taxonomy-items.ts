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

// brand 與 channel 皆為 products-only：brand 以 product 的 tag_ids 過濾、channel 以 product offers 的 channel_id 過濾，
// guides/links 不貢獻（與 validator 一致，ADR-8/9）。tag 仍跨三型別。
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

  // brand 與 tag 共用 tag_ids predicate，但 brand 為 products-only：成員只來自 product 的 tag_ids，
  // guide/link 不貢獻 brand（與 validator 一致，ADR-8）。
  if (selector.kind === 'brand') {
    return {
      products: source.products.filter((product) => product.tag_ids.includes(selector.id)),
      guides: [],
      links: [],
    }
  }

  // tag 跨三型別以 tag_ids 過濾。
  if (selector.kind === 'tag') {
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
