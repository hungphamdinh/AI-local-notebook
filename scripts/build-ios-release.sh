#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/artifacts/release}"
IOS_DIR="$OUTPUT_DIR/ios"
WORK_DIR="$IOS_DIR/build-$(date +%Y%m%d-%H%M%S)"
ARCHIVE_PATH="$WORK_DIR/LocalNoteAI.xcarchive"
EXPORT_DIR="$WORK_DIR/export"
EXPORT_OPTIONS="${IOS_EXPORT_OPTIONS_PLIST:-$WORK_DIR/ExportOptions.generated.plist}"
TARGET_IPA="$IOS_DIR/LocalNoteAI.ipa"

log() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nError: %s\n' "$1" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

usage() {
  printf '%s\n' \
    "Usage: scripts/build-ios-release.sh" \
    "" \
    "Options through environment variables:" \
    "  CLEAN_BUILD=1" \
    "  OUTPUT_DIR=/absolute/output/path" \
    "  IOS_EXPORT_METHOD=debugging|release-testing|app-store-connect" \
    "  IOS_EXPORT_OPTIONS_PLIST=/absolute/path/ExportOptions.plist"
}

create_export_options() {
  local method="${IOS_EXPORT_METHOD:-debugging}"
  case "$method" in
    debugging|release-testing|app-store-connect) ;;
    *) fail "Unsupported IOS_EXPORT_METHOD: $method" ;;
  esac
  /usr/bin/plutil -create xml1 "$EXPORT_OPTIONS"
  /usr/bin/plutil -insert method -string "$method" "$EXPORT_OPTIONS"
  /usr/bin/plutil -insert destination -string export "$EXPORT_OPTIONS"
  /usr/bin/plutil -insert signingStyle -string automatic "$EXPORT_OPTIONS"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then usage; exit 0; fi
[[ "$#" -eq 0 ]] || fail "This script does not accept positional arguments. Use --help for options."

log "Building iOS release IPA"
[[ "$(uname -s)" == "Darwin" ]] || fail "iOS release builds require macOS."
require_command xcodebuild
require_command shasum
[[ -d "$ROOT_DIR/ios/LocalNoteAI.xcworkspace" ]] || fail "iOS workspace is missing. Run bundle exec pod install in ios first."
mkdir -p "$WORK_DIR"

if [[ -n "${IOS_EXPORT_OPTIONS_PLIST:-}" ]]; then
  [[ -f "$EXPORT_OPTIONS" ]] || fail "Export options file not found: $EXPORT_OPTIONS"
else
  create_export_options
fi

archive_actions=()
if [[ "${CLEAN_BUILD:-0}" == "1" ]]; then archive_actions+=(clean); fi
archive_actions+=(archive)
xcodebuild \
  -workspace "$ROOT_DIR/ios/LocalNoteAI.xcworkspace" \
  -scheme LocalNoteAI \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  "${archive_actions[@]}"

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS"

shopt -s nullglob
ipa_files=("$EXPORT_DIR"/*.ipa)
shopt -u nullglob
[[ "${#ipa_files[@]}" -gt 0 ]] || fail "Xcode export completed without producing an IPA. Verify Signing & Capabilities in Xcode."
cp "${ipa_files[0]}" "$TARGET_IPA"
shasum -a 256 "$TARGET_IPA" > "$TARGET_IPA.sha256"

log "iOS artifact: $TARGET_IPA"
