export function extractContentId(id: string): string {
  const last_segment = id.split('/').at(-1)
  if (last_segment === undefined) {
    return id
  }

  // 先切掉 query（dev fetch 可能帶 ?x=1），再去 .json 副檔名；
  // 否則 query 在尾端時 `.json` 非結尾、剝不掉，id 會誤帶 query 而 404。
  return last_segment.split('?')[0].replace(/\.json$/, '')
}
