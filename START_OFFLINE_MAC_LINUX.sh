#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
node scripts/offline-server.mjs
