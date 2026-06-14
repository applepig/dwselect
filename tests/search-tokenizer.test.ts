import { describe, expect, it } from 'vitest'

import { tokenizeSearchText } from '../app/utils/search/search-tokenizer'

describe('search tokenizer', () => {
  it('should tokenize zh-Hant words with Intl.Segmenter when available', () => {
    const segmenter = {
      segment: () => [
        { segment: '機械', isWordLike: true },
        { segment: '鍵盤', isWordLike: true },
        { segment: ' ', isWordLike: false },
        { segment: 'Pro', isWordLike: true },
      ],
    }

    expect(tokenizeSearchText('機械鍵盤 Pro', { segmenter })).toEqual(['機械', '鍵盤', 'pro'])
  })

  it('should ignore punctuation and duplicate normalized tokens', () => {
    const segmenter = {
      segment: () => [
        { segment: 'USB-C', isWordLike: true },
        { segment: '，', isWordLike: false },
        { segment: 'usb-c', isWordLike: true },
      ],
    }

    expect(tokenizeSearchText('USB-C，usb-c', { segmenter })).toEqual(['usb-c'])
  })

  it('should use CJK bigram fallback when Intl.Segmenter is unavailable', () => {
    expect(tokenizeSearchText('機械鍵盤 Pro 2', { segmenter: null })).toEqual([
      '機械',
      '械鍵',
      '鍵盤',
      'pro',
      '2',
    ])
  })
})
