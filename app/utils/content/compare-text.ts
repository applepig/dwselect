export function compareText(left_value: string, right_value: string): number {
  const left_chars = Array.from(left_value.normalize('NFKC'))
  const right_chars = Array.from(right_value.normalize('NFKC'))
  const length = Math.min(left_chars.length, right_chars.length)

  for (let i = 0; i < length; i += 1) {
    const left_code_point = left_chars[i]?.codePointAt(0) ?? 0
    const right_code_point = right_chars[i]?.codePointAt(0) ?? 0

    if (left_code_point !== right_code_point) {
      return left_code_point - right_code_point
    }
  }

  return left_chars.length - right_chars.length
}
