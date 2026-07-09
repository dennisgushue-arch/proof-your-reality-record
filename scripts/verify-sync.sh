#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
reset='\033[0m'

ok() { echo -e "${green}SYNCED${reset}  - $1"; }
warn() { echo -e "${yellow}CHECK${reset}   - $1"; }
bad() { echo -e "${red}NOT SYNCED${reset} - $1"; }

printf "\nRepo sync verification (%s)\n" "$(date -u +'%Y-%m-%d %H:%M:%SZ')"
printf "Branch: %s\n\n" "$(git rev-parse --abbrev-ref HEAD)"

# 1) Main branch parity with origin/main
if git rev-parse --abbrev-ref HEAD | grep -qx "main"; then
  git fetch origin main >/dev/null 2>&1 || true
  local_head="$(git rev-parse HEAD)"
  remote_head="$(git rev-parse origin/main 2>/dev/null || echo '')"
  if [[ -n "$remote_head" && "$local_head" == "$remote_head" ]]; then
    ok "Local main matches origin/main ($local_head)"
  else
    bad "Local main differs from origin/main (local=${local_head:0:8}, origin=${remote_head:0:8})"
  fi
else
  warn "Not on main branch (current: $(git rev-parse --abbrev-ref HEAD))"
fi

# 2) Working tree cleanliness
if [[ -z "$(git status --porcelain)" ]]; then
  ok "Working tree clean"
else
  warn "Working tree has local changes"
  git status --short | sed 's/^/       /'
fi

# 3) Critical billing/auth commits present
required_commits=(
  "200d9c01:Supabase URL fallback"
  "f5bc3772:checkout auth header + error reporting"
  "eefb0ebd:Stripe discounts parameter conflict fix"
  "4e000be2:price secret validation"
  "b09b9523:STRIPE_SECRET_KEY validation"
)
for entry in "${required_commits[@]}"; do
  sha="${entry%%:*}"
  label="${entry#*:}"
  if git merge-base --is-ancestor "$sha" HEAD 2>/dev/null; then
    ok "Commit present ($sha) - $label"
  else
    bad "Commit missing ($sha) - $label"
  fi
done

# 4) Android version info
build_gradle="android/app/build.gradle"
version_code="$(grep -E 'versionCode\s+[0-9]+' "$build_gradle" | awk '{print $2}' | tail -n1 || true)"
version_name="$(grep -E 'versionName\s+"' "$build_gradle" | sed -E 's/.*"([^"]+)".*/\1/' | tail -n1 || true)"
if [[ -n "$version_code" && -n "$version_name" ]]; then
  warn "Android version currently versionCode=${version_code}, versionName=${version_name} (compare against Play Console)"
else
  bad "Could not parse Android versionCode/versionName"
fi

# 5) Microphone compatibility check
manifest="android/app/src/main/AndroidManifest.xml"
if grep -q 'android.hardware.microphone' "$manifest"; then
  if grep -q 'android:required="false"' "$manifest" && grep -A2 'android.hardware.microphone' "$manifest" | grep -q 'required="false"'; then
    ok "Manifest keeps microphone optional (required=false)"
  else
    bad "Manifest references microphone but not optional"
  fi
else
  warn "No explicit optional microphone feature found in manifest"
fi

# 6) AAB artifact presence
root_aab="app-release.aab"
bundle_aab="android/app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$bundle_aab" ]]; then
  ok "Built AAB exists at $bundle_aab"
elif [[ -f "$root_aab" ]]; then
  warn "AAB found at root ($root_aab) - ensure this is the latest artifact"
else
  bad "No release AAB found in expected locations"
fi

# 7) Website availability check
site="https://www.proofrealityrecord.xyz"
http_line="$(curl -Is "$site" | head -n1 || true)"
if echo "$http_line" | grep -q '200'; then
  ok "Website reachable ($http_line)"
else
  warn "Website status check inconclusive ($http_line)"
fi

cat <<'TXT'

Legend:
- SYNCED: verified from current repo/runtime data
- CHECK: needs manual confirmation (e.g., Play Console / hosting deploy metadata)
- NOT SYNCED: clear mismatch or missing requirement
TXT
