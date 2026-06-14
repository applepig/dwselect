type SegmenterLike = {
  segment: (input: string) => Iterable<{
    segment: string
    isWordLike?: boolean
  }>
}

type TokenizeOptions = {
  segmenter?: SegmenterLike | null
}

const CJK_PATTERN = /[\u3400-\u9fff]/
const WORD_PATTERN = /[\p{Letter}\p{Number}]+(?:[-_][\p{Letter}\p{Number}]+)*/gu

export function tokenizeSearchText(input: string, options: TokenizeOptions = {}): string[] {
  const normalized_input = input.trim()

  if (normalized_input === '') {
    return []
  }

  const segmenter = getSegmenter(options)

  if (segmenter !== null) {
    return uniqueTokens(Array.from(segmenter.segment(normalized_input), getTokenFromSegment))
  }

  return uniqueTokens(getFallbackTokens(normalized_input))
}

function getSegmenter(options: TokenizeOptions): SegmenterLike | null {
  if ('segmenter' in options) {
    return options.segmenter ?? null
  }

  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    return null
  }

  return new Intl.Segmenter('zh-Hant', { granularity: 'word' })
}

function getTokenFromSegment(segment: { segment: string, isWordLike?: boolean }) {
  if (segment.isWordLike === false) {
    return ''
  }

  return normalizeToken(segment.segment)
}

function getFallbackTokens(input: string): string[] {
  const tokens: string[] = []
  const normalized_input = input.toLocaleLowerCase()

  for (const match of normalized_input.matchAll(WORD_PATTERN)) {
    const value = match[0]

    if (CJK_PATTERN.test(value)) {
      tokens.push(...getCjkBigrams(value))
      continue
    }

    tokens.push(value)
  }

  return tokens
}

function getCjkBigrams(value: string) {
  const characters = Array.from(value).filter((character) => CJK_PATTERN.test(character))

  if (characters.length <= 1) {
    return characters
  }

  const bigrams: string[] = []

  for (let i = 0; i < characters.length - 1; i += 1) {
    bigrams.push(`${characters[i]}${characters[i + 1]}`)
  }

  return bigrams
}

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase()
}

function uniqueTokens(tokens: string[]) {
  const unique_tokens: string[] = []
  const seen_tokens = new Set<string>()

  for (const token of tokens.map(normalizeToken)) {
    if (token === '' || seen_tokens.has(token)) {
      continue
    }

    unique_tokens.push(token)
    seen_tokens.add(token)
  }

  return unique_tokens
}
