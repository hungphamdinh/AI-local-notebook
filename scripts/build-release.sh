#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-all}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/artifacts/release}"
APP_NAME="LocalNoteAI"

log() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nError: %s\n' "$1" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

usage() {
  printf '%s\n' \
    "Usage: scripts/build-release.sh [android|ios|all]" \
    "" \
    "Build targets:" \
    "  android    Build a release APK" \
    "  ios        Archive and export an IPA" \
    "  all        Build both platforms (default)" \
    "" \
    "Options through environment variables:" \
    "  CLEAN_BUILD=1" \
    "  OUTPUT_DIR=/absolute/output/path" \
    "  IOS_EXPORT_METHOD=debugging|release-testing|app-store-connect" \
    "  IOS_EXPORT_OPTIONS_PLIST=/absolute/path/ExportOptions.plist"
}

write_checksum() {
  local artifact="$1"
  require_command shasum
  shasum -a 256 "$artifact" > "$artifact.sha256"
}

build_android() {
  log "Building Android release APK"
  require_command java
  [[ -x "$ROOT_DIR/android/gradlew" ]] || fail "Android Gradle wrapper is missing or not executable."

  if [[ "${CLEAN_BUILD:-0}" == "1" ]]; then (cd "$ROOT_DIR/android" && ./gradlew clean); fi
  (cd "$ROOT_DIR/android" && ./gradlew :app:assembleRelease)

  local source_apk="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
  local target_apk="$OUTPUT_DIR/android/$APP_NAME-release.apk"
  [[ -f "$source_apk" ]] || fail "Gradle completed without producing $source_apk"
  mkdir -p "$OUTPUT_DIR/android"
  cp "$source_apk" "$target_apk"
  write_checksum "$target_apk"
  log "Android artifact: $target_apk"
}

create_export_options() {
  local destination="$1"
  local method="${IOS_EXPORT_METHOD:-debugging}"
  case "$method" in
    debugging|release-testing|app-store-connect) ;;
    *) fail "Unsupported IOS_EXPORT_METHOD: $method" ;;
  esac
  /usr/bin/plutil -create xml1 "$destination"
  /usr/bin/plutil -insert method -string "$method" "$destination"
  /usr/bin/plutil -insert destination -string export "$destination"
  /usr/bin/plutil -insert signingStyle -string automatic "$destination"
}

build_ios() {
  log "Building iOS release IPA"
  [[ "$(uname -s)" == "Darwin" ]] || fail "iOS release builds require macOS."
  require_command xcodebuild
  [[ -d "$ROOT_DIR/ios/LocalNoteAI.xcworkspace" ]] || fail "iOS workspace is missing. Run bundle exec pod install in ios first."

  local ios_dir="$OUTPUT_DIR/ios"
  local work_dir="$ios_dir/build-$(date +%Y%m%d-%H%M%S)"
  local archive_path="$work_dir/$APP_NAME.xcarchive"
  local export_dir="$work_dir/export"
  local export_options="${IOS_EXPORT_OPTIONS_PLIST:-$work_dir/ExportOptions.generated.plist}"
  mkdir -p "$work_dir"

  if [[ -n "${IOS_EXPORT_OPTIONS_PLIST:-}" ]]; then
    [[ -f "$export_options" ]] || fail "Export options file not found: $export_options"
  else
    create_export_options "$export_options"
  fi

  local archive_actions=()
  if [[ "${CLEAN_BUILD:-0}" == "1" ]]; then archive_actions+=(clean); fi
  archive_actions+=(archive)
  xcodebuild \
    -workspace "$ROOT_DIR/ios/LocalNoteAI.xcworkspace" \
    -scheme LocalNoteAI \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$archive_path" \
    "${archive_actions[@]}"

  xcodebuild \
    -exportArchive \
    -archivePath "$archive_path" \
    -exportPath "$export_dir" \
    -exportOptionsPlist "$export_options"

  shopt -s nullglob
  local ipa_files=("$export_dir"/*.ipa)
  shopt -u nullglob
  [[ "${#ipa_files[@]}" -gt 0 ]] || fail "Xcode export completed without producing an IPA. Verify Signing & Capabilities in Xcode."
  cp "${ipa_files[0]}" "$ios_dir/$APP_NAME.ipa"
  write_checksum "$ios_dir/$APP_NAME.ipa"
  log "iOS artifact: $ios_dir/$APP_NAME.ipa"
}

case "$TARGET" in
  android) mkdir -p "$OUTPUT_DIR"; build_android ;;
  ios) mkdir -p "$OUTPUT_DIR"; build_ios ;;
  all) mkdir -p "$OUTPUT_DIR"; build_android; build_ios ;;
  -h|--help) usage; exit 0 ;;
  *) usage; fail "Unknown target: $TARGET" ;;
esac

log "Release build completed"
