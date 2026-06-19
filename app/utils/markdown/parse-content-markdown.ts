export type ContentMarkdownInlineSegment
  = | { type: 'text', text: string }
    | { type: 'link', text: string, href: string }

export type ContentMarkdownBlock
  = | { type: 'heading', level: 2 | 3 | 4, segments: ContentMarkdownInlineSegment[] }
    | { type: 'paragraph', segments: ContentMarkdownInlineSegment[] }
    | { type: 'list', items: ContentMarkdownInlineSegment[][] }

const HEADING_PATTERN = /^(#{2,4})\s+(.+)$/
const LIST_ITEM_PATTERN = /^[-*]\s+(.+)$/
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\(([^)\s]+)\)/g

export function parseContentMarkdown(markdown: string): ContentMarkdownBlock[] {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const blocks: ContentMarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!.trim()

    if (line === '') {
      i += 1
      continue
    }

    const heading_match = HEADING_PATTERN.exec(line)

    if (heading_match) {
      blocks.push({
        type: 'heading',
        level: heading_match[1]!.length as 2 | 3 | 4,
        segments: parseContentMarkdownInlines(heading_match[2]!),
      })
      i += 1
      continue
    }

    const list_match = LIST_ITEM_PATTERN.exec(line)

    if (list_match) {
      const items: ContentMarkdownInlineSegment[][] = []

      while (i < lines.length) {
        const item_match = LIST_ITEM_PATTERN.exec(lines[i]!.trim())

        if (!item_match) {
          break
        }

        items.push(parseContentMarkdownInlines(item_match[1]!))
        i += 1
      }

      blocks.push({ type: 'list', items })
      continue
    }

    const paragraph_lines = [line]
    i += 1

    while (i < lines.length) {
      const next_line = lines[i]!.trim()

      if (next_line === '' || HEADING_PATTERN.test(next_line) || LIST_ITEM_PATTERN.test(next_line)) {
        break
      }

      paragraph_lines.push(next_line)
      i += 1
    }

    blocks.push({
      type: 'paragraph',
      segments: parseContentMarkdownInlines(paragraph_lines.join(' ')),
    })
  }

  return blocks
}

export function parseContentMarkdownInlines(text: string): ContentMarkdownInlineSegment[] {
  const segments: ContentMarkdownInlineSegment[] = []
  let last_index = 0

  for (const match of text.matchAll(MARKDOWN_LINK_PATTERN)) {
    const match_index = match.index ?? 0
    const raw_link = match[0]!
    const link_text = match[1]!
    const href = match[2]!

    if (match_index > last_index) {
      segments.push({ type: 'text', text: text.slice(last_index, match_index) })
    }

    if (isHttpUrl(href)) {
      segments.push({ type: 'link', text: link_text, href })
    }
    else {
      segments.push({ type: 'text', text: raw_link })
    }

    last_index = match_index + raw_link.length
  }

  if (last_index < text.length) {
    segments.push({ type: 'text', text: text.slice(last_index) })
  }

  return segments
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}
