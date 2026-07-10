import { describe, expect, it } from 'vitest'

import { getDisqusShortname } from '../app/utils/disqus-settings'

describe('getDisqusShortname', () => {
  it('解析 build-time optional shortname；env 缺席時為空字串（AC15）', () => {
    expect(getDisqusShortname()).toBe(process.env.DISQUS_SHORTNAME?.trim() ?? '')
  })
})
