import { expect, it } from 'vitest';
import { isNewer, isReleaseUrl } from '../src/shared/updates.ts';

it('compares versions', () => {
  expect(isNewer('0.7.1', '0.7.0')).toBe(true);
  expect(isNewer('v0.10.0', '0.9.9')).toBe(true);
  expect(isNewer('0.7.0', '0.7.0')).toBe(false);
  expect(isNewer('0.7', '0.7.1')).toBe(false);
  expect(isNewer('1.0.0-beta', '0.9.0')).toBe(true);
});

it('opens only our release pages', () => {
  expect(isReleaseUrl('https://github.com/pivnoebidlo/potion-rack/releases/tag/v0.7.0')).toBe(true);
  expect(isReleaseUrl('https://evil.example/potion-rack/releases')).toBe(false);
});
