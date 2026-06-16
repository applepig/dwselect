export function extractContentId(id: string): string {
  return id
    .split('/')
    .at(-1)
    ?.replace(/\.json$/, '') ?? id
}
