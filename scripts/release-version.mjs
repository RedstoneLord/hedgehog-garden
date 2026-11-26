import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const VERSION_PATTERN = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})(?:\.([1-9]\d?))?$/;
const LAST_LEGACY_ANDROID_CODE = 5002;

export function releaseVersion(packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version) {
  // npm requires three components before its prerelease identifier.
  return packageVersion.replace(/-hotfix\.([1-9]\d?)$/, '.$1');
}

export function androidVersionCode(version) {
  const match = VERSION_PATTERN.exec(version);
  if (!match) return 0;
  const base = Number(match[1]) * 1_000_000 + Number(match[2]) * 1_000 + Number(match[3]);
  const hotfix = Number(match[4] ?? 0);
  if (!base || (hotfix && base < LAST_LEGACY_ANDROID_CODE)) return 0;
  // Leave the existing APK codes intact, then reserve 99 hotfixes per version.
  const code = hotfix || base > LAST_LEGACY_ANDROID_CODE ? base * 100 + hotfix : base;
  return code <= 2_100_000_000 ? code : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  const version = process.argv[3] ?? releaseVersion();
  const code = androidVersionCode(version);
  if (!code || !['version', 'code', 'candidate'].includes(mode)) {
    throw new Error('Expected a release command and a valid Android version');
  }
  if (mode === 'version') process.stdout.write(version);
  else if (mode === 'code') process.stdout.write(String(code));
  else {
    const published = (process.env.PUBLISHED_TAGS ?? '').split('\n').map(tag => androidVersionCode(tag.replace(/^v/, '')));
    process.stdout.write(published.some(previous => previous >= code) ? 'skip' : String(code));
  }
}
