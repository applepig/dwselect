import { readPublishedJsonEntries } from './read-published-json-entries.ts'

// Why: prerender 清單必須與 detail 頁的 published-only 取資料邏輯同源，否則新增非 published 內容時
// generate 會把它排進 prerender 而撞 404、使 build 失敗。published 判定與讀取共用 readPublishedJsonEntries
// （全站單一真相）。stem 直接取自檔名（= content id）；content id 已於 schema 強制為 ASCII kebab（ADR-11），
// 無需 encodeURIComponent。
export function readPublishedContentStems(content_dir: string): string[] {
  return readPublishedJsonEntries(content_dir).map((entry) => entry.file_name.replace(/\.json$/, ''))
}
