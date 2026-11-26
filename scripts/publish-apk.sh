#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

: "${GITHUB_REPOSITORY:?Set the GitHub repository}"
: "${GITHUB_SHA:?Set the source commit SHA}"

version=$(node -p 'require("./package.json").version')
tag="v$version"
published=$(gh api --paginate "repos/$GITHUB_REPOSITORY/releases" --jq '.[] | select(.draft == false and .prerelease == false) | .tag_name')
version_code=$(PUBLISHED_TAGS="$published" node --input-type=module - "$version" <<'JS'
function versionCode(version) {
  if (!/^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/.test(version)) return 0;
  const [major, minor, patch] = version.split('.').map(Number);
  const code = major * 1_000_000 + minor * 1_000 + patch;
  return code <= 2_100_000_000 ? code : 0;
}

const code = versionCode(process.argv[2]);
if (!code) throw new Error('Expected a stable Android release version in package.json');
const published = process.env.PUBLISHED_TAGS.split('\n').map(tag => versionCode(tag.replace(/^v/, '')));
if (published.some(previous => previous >= code)) process.stdout.write('skip');
else process.stdout.write(String(code));
JS
)
if [[ "$version_code" == skip ]]; then
  printf '%s is already published or superseded.\n' "$tag"
  exit 0
fi

release_dir="versions/$version"
apk="$release_dir/hedgehog-garden-$version.apk"
notes="$release_dir/RELEASE.md"
if [[ ! -f "$apk" || ! -f "$notes" ]]; then
  printf 'Include %s and %s in the release commit.\n' "$apk" "$notes" >&2
  exit 1
fi

: "${ANDROID_HOME:?Set the Android SDK path}"
build_tools="$ANDROID_HOME/build-tools/35.0.0"
if [[ ! -x "$build_tools/apksigner" ]]; then
  sdkmanager 'build-tools;35.0.0'
fi

badging=$("$build_tools/aapt2" dump badging "$apk")
expected_package="package: name='dev.redstonelord.hedgehoggarden' versionCode='$version_code' versionName='$version'"
if [[ "$badging" != "$expected_package "* ]]; then
  echo 'The APK package name or version differs from the release.' >&2
  exit 1
fi

signature=$("$build_tools/apksigner" verify --print-certs "$apk")
expected_signer='3b87fe97cc646956e654b4433e6fcc7706dcd6552fd28b2a73438f1b01ea2d92'
actual_signer=$(awk -F': ' '/^Signer #[0-9]+ certificate SHA-256 digest:/ { print $2 }' <<< "$signature")
if [[ "$actual_signer" != "$expected_signer" ]]; then
  echo 'The APK signer differs from the certificate used by the installed Android app.' >&2
  exit 1
fi

gh release create "$tag" "$apk" --repo "$GITHUB_REPOSITORY" --target "$GITHUB_SHA" \
  --title "Яблочный сад $version для Android" --notes-file "$notes" --latest

asset_digest=$(gh api "repos/$GITHUB_REPOSITORY/releases/tags/$tag" \
  --jq ".assets[] | select(.name == \"$(basename "$apk")\") | .digest")
expected_digest=$(sha256sum "$apk" | cut -d ' ' -f 1)
if [[ "$asset_digest" != "sha256:$expected_digest" ]]; then
  echo 'The published asset checksum did not match the signed build.' >&2
  exit 1
fi
printf 'Published %s with SHA-256 %s.\n' "$tag" "$expected_digest"
