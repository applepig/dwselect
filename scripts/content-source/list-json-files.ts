import type { Dirent } from 'node:fs'
import { readdirSync } from 'node:fs'
import { readdir } from 'node:fs/promises'

import { isMissingFileError } from './is-missing-file-error.ts'

// content-source 的 .json 枚舉底座：async／sync 共用同一「讀目錄→濾 .json→ENOENT 回空」邏輯，
// 各 reader 只在其上疊加自己的讀檔／parse。缺目錄一律回空集合（draft-only 或未建目錄時產物為空集，spec Case 1）。

// sync route builder 用（nuxt.config 同步執行，不能 async）；沿用既有 sync 讀取「不排序」行為，不改變路由枚舉順序。
export function listJsonFileNames(dir: string): string[] {
  let file_names: string[]

  try {
    file_names = readdirSync(dir)
  }
  catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw error
  }

  return file_names.filter((file_name) => file_name.endsWith('.json'))
}

// async 全讀用；沿用既有 async 讀取「依檔名 localeCompare 升冪」行為，讓列表產物順序穩定。
export async function listJsonDirents(dir: string): Promise<Dirent[]> {
  let entries: Dirent[]

  try {
    entries = await readdir(dir, { withFileTypes: true })
  }
  catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw error
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .toSorted((left_entry, right_entry) => left_entry.name.localeCompare(right_entry.name))
}
