#!/usr/bin/env bash
set -euo pipefail

# Package the Chrome extension into a minimal uploadable ZIP.
# - Builds TS
# - Creates extension/readme-ai-build with only the runtime files
# - Zips it as extension/readme-ai-build.zip

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="${SCRIPT_DIR%/scripts}"
EXT_DIR="$REPO_ROOT/extension"
BUILD_DIR="$EXT_DIR/readme-ai-build"
ZIP_PATH="$EXT_DIR/readme-ai-build.zip"

# Ensure build output is fresh
echo "[pack] Cleaning previous build directory and zip (if any)"
rm -rf "$BUILD_DIR" "$ZIP_PATH"

# Compile extension TypeScript
echo "[pack] Building extension TypeScript"
npm run --silent build:extension

# Create build directory
mkdir -p "$BUILD_DIR"

# Copy required top-level files
echo "[pack] Copying runtime files"
cp "$EXT_DIR/manifest.json" "$BUILD_DIR/"
cp "$EXT_DIR/sidebar.html" "$BUILD_DIR/"
cp "$EXT_DIR/sidebar.js" "$BUILD_DIR/"
if [[ -f "$EXT_DIR/onboarding.html" ]]; then
  cp "$EXT_DIR/onboarding.html" "$BUILD_DIR/"
  echo "[pack] Included onboarding.html"
else
  echo "[pack] onboarding.html not found; skipping"
fi

# Copy directories: dist, shared, assets
cp -R "$EXT_DIR/dist" "$BUILD_DIR/dist"
cp -R "$EXT_DIR/shared" "$BUILD_DIR/shared"
cp -R "$EXT_DIR/assets" "$BUILD_DIR/assets"

# Optionally duplicate icon naming to match alternate conventions
# If icon-128.png is expected by reviewers, create an alias (manifest still uses icon128.png)
if [[ -f "$BUILD_DIR/assets/icon128.png" && ! -f "$BUILD_DIR/assets/icon-128.png" ]]; then
  cp "$BUILD_DIR/assets/icon128.png" "$BUILD_DIR/assets/icon-128.png"
fi

# Quick sanity check for essential files
required=(
  "$BUILD_DIR/manifest.json"
  "$BUILD_DIR/sidebar.html"
  "$BUILD_DIR/sidebar.js"
  "$BUILD_DIR/onboarding.html"
  "$BUILD_DIR/shared/constants.global.js"
  "$BUILD_DIR/dist/background.js"
  "$BUILD_DIR/dist/content-script.js"
  "$BUILD_DIR/dist/shared/constants.js"
)

missing=0
for f in "${required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "[pack] Missing required file: $f" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  echo "[pack] Aborting: required files missing" >&2
  exit 1
fi

# Create ZIP
echo "[pack] Creating zip: $ZIP_PATH"
(cd "$EXT_DIR" && zip -qr "$(basename -- "$ZIP_PATH")" "$(basename -- "$BUILD_DIR")")

# Summary
cat <<EOF
[pack] Done.
- Build folder: $BUILD_DIR
- Zip file:     $ZIP_PATH

Upload the ZIP file to the Chrome Web Store.
EOF
