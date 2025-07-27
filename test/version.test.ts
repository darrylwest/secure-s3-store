// test/version.test.ts
import { getVersion } from '../src/version.js';

describe('getVersion', () => {
  it('should return a valid version string', () => {
    const version = getVersion();
    // Check for a basic semantic versioning pattern (e.g., 1.0.0)
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
