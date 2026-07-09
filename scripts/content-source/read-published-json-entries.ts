import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { isPublished } from '../../app/utils/content/is-published.ts'
import { listJsonFileNames } from './list-json-files.ts'

// sync published JSON 讀取的單一真相：listJsonFileNames → 逐檔 readFileSync+JSON.parse → filter isPublished。
// route builder（stem）與 taxonomy items reader（data）共用同一讀取／過濾，各自只留輸出投影。
export function readPublishedJsonEntries(dir: string): { file_name: string, data: unknown }[] {
  return listJsonFileNames(dir)
    .map((file_name) => ({ file_name, data: JSON.parse(readFileSync(join(dir, file_name), 'utf8')) }))
    .filter((entry) => isPublished(entry.data as { status: string }))
}
