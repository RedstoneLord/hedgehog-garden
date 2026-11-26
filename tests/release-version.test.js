import assert from 'node:assert/strict';
import { test } from 'node:test';
import { androidVersionCode, releaseVersion } from '../scripts/release-version.mjs';

test('Android hotfixes retain legacy codes and sort between ordinary releases', () => {
  assert.equal(releaseVersion('0.5.2-hotfix.1'), '0.5.2.1');
  assert.equal(releaseVersion('0.5.3'), '0.5.3');
  const releases = ['0.5.0', '0.5.1', '0.5.2', '0.5.2.1', '0.5.2.2', '0.5.3', '0.5.3.1', '0.6.0'];
  assert.deepEqual(releases.map(androidVersionCode), [5000, 5001, 5002, 500201, 500202, 500300, 500301, 600000]);
  assert.deepEqual(['0.5.1.1', '0.5.2.0', '0.5.2.100', '0.5.3-beta.1'].map(androidVersionCode), [0, 0, 0, 0]);
});
