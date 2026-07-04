// Why: taxonomy「種類」的 404 文案與 label getter 原本散落 breadcrumb、build-taxonomy-page-data
// 與四個 taxonomy 頁，改一處需同步多檔。此表把這組「kind→字串／getter 映射」收成單一真相。
// url prefix 不存表：kind 即 url segment（由 Nuxt 檔案路由 app/pages/{kind}/[id].vue 鎖死），
// 需要前綴時一律用 `/${kind}/` 衍生（與 taxonomy-page-seo.ts 的 canonical 衍生一致），避免第三份分裂真相。
// 刻意只收斂可一一對應者；namespace 防呆（isSelectorIdInNamespace）、各 kind id 欄位差異
// （selectPublishedTaxonomyItems）、description 有無（resolveDescription）是真實 domain 邏輯，留原處（ADR-2）。

import type { TaxonomyKind } from './select-taxonomy-items.ts'
import type { createTaxonomyLabelResolver } from '../content/taxonomy-labels.ts'

export type TaxonomyKindConfig = {
  notFoundMessage: string
  getLabel: (labels: ReturnType<typeof createTaxonomyLabelResolver>, id: string) => string
}

// label getter 依 kind 映射（ADR-8/9/10）：category→categories、channel→channels.json、
// tag/brand→tags（getTaxonomyTagLabel 已含 tags→brands→raw-id fallback）。
export const TAXONOMY_KINDS: Record<TaxonomyKind, TaxonomyKindConfig> = {
  category: {
    notFoundMessage: '找不到分類',
    getLabel: (labels, id) => labels.getCategoryLabel(id),
  },
  tag: {
    notFoundMessage: '找不到標籤',
    getLabel: (labels, id) => labels.getTaxonomyTagLabel(id),
  },
  brand: {
    notFoundMessage: '找不到品牌',
    getLabel: (labels, id) => labels.getTaxonomyTagLabel(id),
  },
  channel: {
    notFoundMessage: '找不到通路',
    getLabel: (labels, id) => labels.getChannelLabel(id),
  },
}
