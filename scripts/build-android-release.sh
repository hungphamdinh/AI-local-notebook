#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/artifacts/release}"
SOURCE_APK="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
TARGET_APK="$OUTPUT_DIR/android/LocalNoteAI-release.apk"

log() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nError: %s\n' "$1" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  printf '%s\n' \
    "Usage: scripts/build-android-release.sh" \
    "" \
    "Options through environment variables:" \
    "  CLEAN_BUILD=1" \
    "  OUTPUT_DIR=/absolute/output/path"
  exit 0
fi
[[ "$#" -eq 0 ]] || fail "This script does not accept positional arguments. Use --help for options."

log "Building Android release APK"
require_command java
require_command shasum
[[ -x "$ROOT_DIR/android/gradlew" ]] || fail "Android Gradle wrapper is missing or not executable."

if [[ "${CLEAN_BUILD:-0}" == "1" ]]; then (cd "$ROOT_DIR/android" && ./gradlew clean); fi
(cd "$ROOT_DIR/android" && ./gradlew :app:assembleRelease)

[[ -f "$SOURCE_APK" ]] || fail "Gradle completed without producing $SOURCE_APK"
mkdir -p "$OUTPUT_DIR/android"
cp "$SOURCE_APK" "$TARGET_APK"
shasum -a 256 "$TARGET_APK" > "$TARGET_APK.sha256"

log "Android artifact: $TARGET_APK"
