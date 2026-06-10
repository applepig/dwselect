#!/bin/sh
set -e

if [ "$NUXT_MODE" = "dev" ]; then
  exec pnpm dev
else
  pnpm generate
  exec pnpm preview
fi
