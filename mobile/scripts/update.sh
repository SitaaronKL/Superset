#!/usr/bin/env bash
# Ship a JavaScript-only change over the air to installed TestFlight builds.
# Usage: ./scripts/update.sh "what changed"
#
# Works for screens, styling, copy, and JS logic. Native changes (new native
# packages, app.json plugins/permissions, icons, SDK upgrades) need a new build
# via ./scripts/build-ios.sh. Runtime policy is appVersion: when you ship a
# native change, bump "version" in app.json in the same commit so old builds
# never receive JS that expects native code they lack.
#
# Installed apps pick the update up on launch and apply it on the next cold
# start (fully close and reopen the app, sometimes twice).
set -euo pipefail
cd "$(dirname "$0")/.."
msg="${1:?Usage: ./scripts/update.sh \"what changed\"}"
eas update --channel production --environment production --platform ios --message "$msg" --non-interactive
