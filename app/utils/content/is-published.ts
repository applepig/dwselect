// Browser-safe published 判定：client（search-index 經 client-search 進 browser bundle）
// 與 Node 端（scripts、server routes）共用同一份。刻意零 Node 依賴、獨立單檔、不經 barrel，
// 避免 Vite 解析依賴鏈時把含 node:fs 的 reader 拉進 client bundle。
export function isPublished(content: { status: string }): boolean {
  return content.status === 'published'
}
