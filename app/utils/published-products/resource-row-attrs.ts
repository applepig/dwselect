// Why: 外部連結的 target/rel 三件組與 row type→icon 字面值原本在 resource-rows.ts（runtime）
// 與 scripts/public-payload/map-resource-rows.ts（build-time）各寫一份，改一處需同步兩邊。
// 此檔收成單一真相；只含純資料常數，不 import 任何 runtime-only 邏輯，故 build-time mapper 亦可安全 import。

import type { CompactResourceRow } from './types.ts'

// as const 讓 spread 後 TS 仍推得 '_blank'/'noopener noreferrer' literal，
// 對齊 CompactResourceRow.target/rel 與 ResourceRowLinkAttributes 的 literal union，避免變寬為 string。
export const EXTERNAL_LINK_ATTRS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const

// row type→icon：只有 guide/link 有固定 icon，product 無（查不到→null）。
// 注意：link.icon 是資料驅動（來自 LinkDefinition），不走此表——此表只收「type 決定 icon」者。
export const RESOURCE_ROW_ICONS = {
  guide: 'i-lucide-book-open',
  link: 'i-lucide-link',
} as const satisfies Partial<Record<CompactResourceRow['type'], string>>
