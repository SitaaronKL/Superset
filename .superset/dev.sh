#!/usr/bin/env bash
# Preset: Next.js dev server. Next picks the next free port if 3000 is taken.
set -euo pipefail
cd "$(dirname "$0")/.."
. ./.superset/_common.sh
say "Starting dev server …"
exec npm run dev
