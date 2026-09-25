import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platformArtifacts = [
  { key: 'windows-x86_64', directory: 'windows', suffix: '.exe', architecture: ['x64', 'x86_64', 'amd64'] },
  { key: 'linux-x86_64', directory: 'linux', suffix: '.AppImage', architecture: ['x64', 'x86_64', 'amd64'] },
  { key: 'darwin-aarch64', directory: 'macos', suffix: '.app.tar.gz', architecture: ['arm64', 'aarch64'] },
];

const architectureToken = /(?:^|[_. -])(x64|x86_64|amd64|arm64|aarch64)(?=[_. -]|$)/gi;
const versionToken = /(?<!\d)\d+\.\d+\.\d+(?![.\d])/g;
const tagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const safeAssetNamePattern = /^[A-Za-z0-9._-]+$/;
const bundleDirectories = ['msi', 'nsis', 'deb', 'appimage', 'dmg', 'macos'];

export async function normalizeReleaseAssetNames(bundleRoot) {
  for (const bundleDirectory of bundleDirectories) {
    const directory = path.join(bundleRoot, bundleDirectory);
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    const names = new Set(entries.map((entry) => entry.name));
    for (const entry of entries.filter((item) => item.isFile())) {
      const normalized = entry.name.replace(/[^A-Za-z0-9._-]/g, '.');
      if (!normalized || names.has(normalized) && normalized !== entry.name) {
        throw new Error(`Release asset name collision in ${directory}: ${entry.name} -> ${normalized}`);
      }
      if (normalized !== entry.name) {
        await rename(path.join(directory, entry.name), path.join(directory, normalized));
        names.delete(entry.name);
        names.add(normalized);
      }
    }
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function validateBundleName(file, platform, version) {
  const name = path.basename(file);

  for (const [embeddedVersion] of name.matchAll(versionToken)) {
    if (embeddedVersion !== version) {
      throw new Error(`${platform.key} updater bundle version ${embeddedVersion} does not match ${version}`);
    }
  }

  for (const [, architecture] of name.matchAll(architectureToken)) {
    if (!platform.architecture.includes(architecture.toLowerCase())) {
      throw new Error(`${platform.key} updater bundle architecture ${architecture} is incompatible`);
    }
  }
}

export async function generateReleaseManifest({ artifactsDir, tag, packageVersion, repository }) {
  const tagMatch = tagPattern.exec(tag ?? '');
  if (!tagMatch) {
    throw new Error(`Invalid release tag: ${tag}`);
  }

  const version = tag.slice(1);
  if (version !== packageVersion) {
    throw new Error(`Release tag ${tag} does not match package version ${packageVersion}`);
  }
  if (!repositoryPattern.test(repository ?? '')) {
    throw new Error(`Invalid GitHub repository: ${repository}`);
  }

  const platforms = {};
  const publishedNames = new Set();

  for (const platform of platformArtifacts) {
    const directory = path.join(artifactsDir, platform.directory);
    const files = await listFiles(directory);
    const bundles = files.filter((file) => file.endsWith(platform.suffix));
    if (bundles.length !== 1) {
      throw new Error(`${platform.key} requires exactly one updater bundle (${platform.suffix}); found ${bundles.length}`);
    }

    const bundle = bundles[0];
    validateBundleName(bundle, platform, version);

    const signatures = files.filter((file) => file.endsWith(`${platform.suffix}.sig`));
    if (signatures.length !== 1 || signatures[0] !== `${bundle}.sig`) {
      throw new Error(`${platform.key} requires exactly one matching signature for ${path.basename(bundle)}`);
    }

    const signature = await readFile(signatures[0], 'utf8');
    if (!signature.trim()) {
      throw new Error(`${platform.key} updater signature is empty`);
    }

    const assetName = path.basename(bundle);
    if (!safeAssetNamePattern.test(assetName)) {
      throw new Error(`${platform.key} updater asset name was not normalized: ${assetName}`);
    }
    if (publishedNames.has(assetName)) {
      throw new Error(`Duplicate release asset name: ${assetName}`);
    }
    publishedNames.add(assetName);

    platforms[platform.key] = {
      url: `https://github.com/${repository}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(assetName)}`,
      signature,
    };
  }

  return { version, platforms };
}

async function main() {
  if (process.argv[2] === '--normalize-bundles') {
    const bundleRoot = process.argv[3];
    if (!bundleRoot) throw new Error('Bundle directory is required for --normalize-bundles');
    await normalizeReleaseAssetNames(bundleRoot);
    console.log('Normalized release asset names');
    return;
  }

  const packageMetadata = JSON.parse(await readFile('package.json', 'utf8'));
  const manifest = await generateReleaseManifest({
    artifactsDir: process.env.RELEASE_ARTIFACTS_DIR ?? 'artifacts',
    tag: process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
      ? `v${packageMetadata.version}`
      : process.env.RELEASE_TAG,
    packageVersion: packageMetadata.version,
    repository: process.env.GITHUB_REPOSITORY,
  });
  await writeFile('latest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Generated latest.json for ${manifest.version}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
