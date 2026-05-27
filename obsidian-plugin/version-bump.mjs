import { readFileSync, writeFileSync } from 'fs';

const targetVersion = process.argv[2];
if (!targetVersion) {
  console.error('Usage: node version-bump.mjs <version>');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
manifest.version = targetVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));

const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[targetVersion] = manifest.minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, 2));
