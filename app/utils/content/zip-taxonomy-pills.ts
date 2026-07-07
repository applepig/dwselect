// taxonomy pill 的並列陣列配對：ids／labels 由 mapper 同源同序映射，以 index 配對安全；
// label 缺漏時 fallback 為 id，避免顯示空字串。product/guide detail 的 category／tag／brand pill 共用。
export function zipTaxonomyPills(ids: string[], labels: string[]): { id: string, label: string }[] {
  return ids.map((id, index) => ({ id, label: labels[index] ?? id }))
}
