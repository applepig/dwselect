import { describe, expect, it } from 'vitest'

import { zipTaxonomyPills } from '../app/utils/content/zip-taxonomy-pills'

describe('zipTaxonomyPills', () => {
  it('以 index 把 id 與對應 label 配成 pill', () => {
    expect(zipTaxonomyPills(['ergonomic', 'wireless'], ['人體工學', '無線'])).toEqual([
      { id: 'ergonomic', label: '人體工學' },
      { id: 'wireless', label: '無線' },
    ])
  })

  it('回傳空陣列，當沒有任何 id', () => {
    expect(zipTaxonomyPills([], [])).toEqual([])
  })

  it('以 id 作為 label 的 fallback，當對應 index 的 label 缺漏', () => {
    expect(zipTaxonomyPills(['panasonic', 'sony'], ['Panasonic'])).toEqual([
      { id: 'panasonic', label: 'Panasonic' },
      { id: 'sony', label: 'sony' },
    ])
  })
})
