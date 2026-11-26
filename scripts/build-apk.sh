#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

sdk="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
tools="$sdk/build-tools/35.0.0"
platform="$sdk/platforms/android-35/android.jar"
signing="${ORCHARD_SIGNING_DIR:-$PWD/android/signing}"
keystore="$signing/orchard.p12"
password="$signing/password"

if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [[ ! -r "$platform" || ! -x "$tools/aapt2" || ! -x "$tools/apksigner" ]] || ! command -v javac >/dev/null; then
  echo 'JDK 17 and Android SDK platform 35 with build-tools 35.0.0 are required.' >&2
  exit 1
fi

if [[ "${1:-}" == '--init-key' ]]; then
  if [[ -e "$keystore" || -e "$password" ]]; then
    echo 'The signing directory already contains a key or password.' >&2
    exit 1
  fi
  (
    umask 077
    mkdir -p "$signing"
    openssl rand -hex 32 > "$password"
    keytool -genkeypair -keystore "$keystore" -storetype PKCS12 -storepass:file "$password" -alias orchard \
      -dname 'CN=Hedgehog Garden, O=RedstoneLord' -keyalg RSA -keysize 3072 -validity 36500
  )
  shift
fi
if [[ ! -r "$keystore" || ! -r "$password" ]]; then
  echo 'Supply the existing release key and password in ORCHARD_SIGNING_DIR, or use --init-key for the first release.' >&2
  exit 1
fi
if (( $# > 1 )); then
  echo 'Usage: scripts/build-apk.sh [--init-key] [version]' >&2
  exit 1
fi
version="${1:-$(node scripts/release-version.mjs version)}"
version_code=$(node scripts/release-version.mjs code "$version")

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/assets" "$scratch/classes" "$scratch/dex"
npm run build
node scripts/standalone.mjs "$scratch/assets/play.html"

"$tools/aapt2" compile --dir android/res -o "$scratch/resources.zip"
"$tools/aapt2" link -I "$platform" --manifest android/AndroidManifest.xml \
  --min-sdk-version 26 --target-sdk-version 35 --version-name "$version" --version-code "$version_code" \
  -A "$scratch/assets" -o "$scratch/resources.apk" "$scratch/resources.zip"
mapfile -t java_sources < <(find android/src -name '*.java' -type f | sort)
javac --release 8 -classpath "$platform" -d "$scratch/classes" "${java_sources[@]}"
jar cf "$scratch/classes.jar" -C "$scratch/classes" .
"$tools/d8" --release --lib "$platform" --min-api 26 --output "$scratch/dex" "$scratch/classes.jar"
(
  cd "$scratch/dex"
  zip -q -j "$scratch/resources.apk" classes.dex
)
"$tools/zipalign" -f 4 "$scratch/resources.apk" "$scratch/aligned.apk"
"$tools/apksigner" sign --ks "$keystore" --ks-pass "file:$password" --ks-key-alias orchard \
  --out "$scratch/signed.apk" "$scratch/aligned.apk"
"$tools/apksigner" verify --verbose --print-certs "$scratch/signed.apk"
"$tools/zipalign" -c 4 "$scratch/signed.apk"
destination="${ORCHARD_APK_OUTPUT:-versions/$version/hedgehog-garden-$version.apk}"
mkdir -p "$(dirname "$destination")"
cp "$scratch/signed.apk" "$destination"
printf 'Ready: %s\n' "$destination"
