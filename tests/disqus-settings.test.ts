import { describe, expect, it } from 'vitest'

import { parseDisqusShortname } from '../app/utils/disqus-settings'

describe('parseDisqusShortname', () => {
  it.each([
    ['設定的 shortname', 'dwselect', 'dwselect'],
    ['空值', '', ''],
    ['全空白值', '   ', ''],
    ['前後有空白的值', '  dwselect  ', 'dwselect'],
  ])('回傳 %s 的正規化 shortname', (_description, input, expected) => {
    expect(parseDisqusShortname(input)).toBe(expected)
  })
})
