// src/version.ts
import fs from 'fs';
import path from 'path';
/**
 * Returns the current version of the secure-s3-store package.
 * @returns The package version string (e.g., "1.0.0").
 */
export function getVersion() {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
}
//# sourceMappingURL=version.js.map