#!/usr/bin/env bash

file_path="${1:-}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
project_root="$(dirname "$script_dir")"

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *.vue|*.ts|*.js|*.mjs) ;;
  *) exit 0 ;;
esac

case "$file_path" in
  /*) abs_path="$file_path" ;;
  *) abs_path="$PWD/$file_path" ;;
esac

case "$abs_path" in
  "$project_root"/*) lint_path="${abs_path#$project_root/}" ;;
  *) lint_path="$abs_path" ;;
esac

lint_output="$(mktemp)"
(cd "$project_root" && pnpm --silent exec eslint --fix --max-warnings=0 --no-ignore "$lint_path" >"$lint_output" 2>&1)
lint_status="$?"

if [ "$lint_status" -eq 0 ]; then
  rm -f "$lint_output"
  exit 0
fi

printf '[post-edit-hook] {"status":"failed","file":"%s","exit_code":%s}\n' "$abs_path" "$lint_status" >&2
sed 's/^/[post-edit-hook] /' "$lint_output" >&2
rm -f "$lint_output"
exit 0
