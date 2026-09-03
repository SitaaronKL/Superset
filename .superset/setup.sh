#!/usr/bin/env bash
# Run by Superset once when it creates a new workspace (see .superset/config.json).
# Idempotent: a second run is a no-op.
set -euo pipefail
cd "$(dirname "$0")/.."
. ./.superset/_common.sh

command -v node >/dev/null || die "node not found — install Node 20+ (brew install node)"
copy_env_from_main
npm_install_if_needed mobile
npm_install_if_needed
say "Workspace ready"
