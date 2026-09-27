#!/usr/bin/env bash
# Production iOS build + TestFlight submit on Ayen's Apple team, authenticated
# with the App Store Connect API key kept outside the repo at ~/keys.
# Usage: ./scripts/build-ios.sh            (build, then auto-submit)
#        ./scripts/build-ios.sh --no-submit
set -euo pipefail
cd "$(dirname "$0")/.."
export EXPO_ASC_API_KEY_PATH="$HOME/keys/AuthKey_R3G2387LF3.p8"
export EXPO_ASC_KEY_ID="R3G2387LF3"
export EXPO_ASC_ISSUER_ID="4c77b2f4-2964-4aa0-adc0-72fbc3051705"
export EXPO_APPLE_TEAM_ID="MX63A5TH65"
export EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
export EAS_BUILD_NO_EXPO_GO_WARNING=true
if [[ "${1:-}" == "--no-submit" ]]; then
  exec eas build --platform ios --profile production
fi
exec eas build --platform ios --profile production --auto-submit
