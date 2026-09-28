#!/usr/bin/env bash
# Production iOS build on EAS, then upload straight to App Store Connect with
# the API key (EAS's own submission queue stalled for over an hour on builds
# 11 and 12). Key lives outside the repo at ~/keys.
# Usage: ./scripts/build-ios.sh
set -euo pipefail
cd "$(dirname "$0")/.."
KEY_ID="R3G2387LF3"
ISSUER="4c77b2f4-2964-4aa0-adc0-72fbc3051705"
export EXPO_ASC_API_KEY_PATH="$HOME/keys/AuthKey_${KEY_ID}.p8"
export EXPO_ASC_KEY_ID="$KEY_ID" EXPO_ASC_ISSUER_ID="$ISSUER"
export EXPO_APPLE_TEAM_ID="MX63A5TH65" EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
export EAS_BUILD_NO_EXPO_GO_WARNING=true

# altool looks for the key here.
mkdir -p "$HOME/.appstoreconnect/private_keys"
cp -n "$EXPO_ASC_API_KEY_PATH" "$HOME/.appstoreconnect/private_keys/" 2>/dev/null || true

echo "Building on EAS (waits for the build to finish)..."
build_json=$(eas build --platform ios --profile production --non-interactive --wait --json)
url=$(echo "$build_json" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['artifacts']['buildUrl'])")
ipa=$(mktemp -t superset).ipa
curl -sL -o "$ipa" "$url"

echo "Uploading to App Store Connect..."
xcrun altool --upload-app -f "$ipa" -t ios --apiKey "$KEY_ID" --apiIssuer "$ISSUER"
rm -f "$ipa"
echo "Done. TestFlight shows the build after Apple processing (usually 5 to 15 minutes)."
