import { describe, expect, it } from 'vitest'

import { parseContentMarkdown } from '../app/utils/markdown/parse-content-markdown'

describe('content markdown parser', () => {
  it('should parse blog-style headings, bullet lists, paragraphs and safe links', () => {
    expect(parseContentMarkdown(`## 快速判斷

這是一段 [官方資料](https://example.com/product) 的摘要。

## 重要規格

- 12000mAh、38.4Wh
- USB-C PD 20W
- 不接受 [危險連結](javascript:alert)`)).toEqual([
      {
        type: 'heading',
        level: 2,
        segments: [{ type: 'text', text: '快速判斷' }],
      },
      {
        type: 'paragraph',
        segments: [
          { type: 'text', text: '這是一段 ' },
          { type: 'link', text: '官方資料', href: 'https://example.com/product' },
          { type: 'text', text: ' 的摘要。' },
        ],
      },
      {
        type: 'heading',
        level: 2,
        segments: [{ type: 'text', text: '重要規格' }],
      },
      {
        type: 'list',
        items: [
          [{ type: 'text', text: '12000mAh、38.4Wh' }],
          [{ type: 'text', text: 'USB-C PD 20W' }],
          [{ type: 'text', text: '不接受 ' }, { type: 'text', text: '[危險連結](javascript:alert)' }],
        ],
      },
    ])
  })
})
