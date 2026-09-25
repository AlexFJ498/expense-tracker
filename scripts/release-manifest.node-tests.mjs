import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { generateReleaseManifest, normalizeReleaseAssetNames } from './release-manifest.mjs';

const temporaryDirectories = [];
const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL('./release-manifest.mjs', import.meta.url));

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function writeArtifact(root, relativePath, content = 'bundle') {
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

async function completeArtifacts() {
  const root = await mkdtemp(path.join(tmpdir(), 'expense-tracker-release-'));
  temporaryDirectories.push(root);

  for (const [artifact, signature] of [
    ['windows/nsis/Expense.Tracker_1.5.3_x64-setup.exe', 'windows-signature\n'],
    ['linux/appimage/Expense.Tracker_1.5.3_amd64.AppImage', 'linux-signature\n'],
    ['macos/macos/Expense.Tracker.app.tar.gz', 'macos-signature\n'],
  ]) {
    await writeArtifact(root, artifact);
    await writeArtifact(root, `${artifact}.sig`, signature);
  }

  return root;
}

function generate(root, overrides = {}) {
  return generateReleaseManifest({
    artifactsDir: root,
    tag: 'v1.5.3',
    packageVersion: '1.5.3',
    repository: 'AlexFJ498/expense-tracker',
    ...overrides,
  });
}

test('generates a static updater manifest for all supported platforms', async () => {
  const root = await completeArtifacts();
  const manifest = await generate(root);

  assert.deepEqual(manifest, {
    version: '1.5.3',
    platforms: {
      'windows-x86_64': {
        url: 'https://github.com/AlexFJ498/expense-tracker/releases/download/v1.5.3/Expense.Tracker_1.5.3_x64-setup.exe',
        signature: 'windows-signature\n',
      },
      'linux-x86_64': {
        url: 'https://github.com/AlexFJ498/expense-tracker/releases/download/v1.5.3/Expense.Tracker_1.5.3_amd64.AppImage',
        signature: 'linux-signature\n',
      },
      'darwin-aarch64': {
        url: 'https://github.com/AlexFJ498/expense-tracker/releases/download/v1.5.3/Expense.Tracker.app.tar.gz',
        signature: 'macos-signature\n',
      },
    },
  });
});

test('rejects a missing required updater bundle', async () => {
  const root = await completeArtifacts();
  await rm(path.join(root, 'macos/macos/Expense.Tracker.app.tar.gz'));

  await assert.rejects(generate(root), /darwin-aarch64.*exactly one updater bundle/i);
});

test('rejects a missing or empty matching signature', async () => {
  const root = await completeArtifacts();
  const signature = path.join(root, 'windows/nsis/Expense.Tracker_1.5.3_x64-setup.exe.sig');
  await rm(signature);
  await assert.rejects(generate(root), /windows-x86_64.*signature/i);

  await writeFile(signature, '  \n');
  await assert.rejects(generate(root), /windows-x86_64.*signature/i);
});

test('rejects ambiguous updater bundles', async () => {
  const root = await completeArtifacts();
  await writeArtifact(root, 'linux/appimage/Another_1.5.3_amd64.AppImage');

  await assert.rejects(generate(root), /linux-x86_64.*exactly one updater bundle/i);
});

test('rejects artifact version that disagrees with the release tag', async () => {
  const root = await completeArtifacts();
  await rm(path.join(root, 'linux/appimage/Expense.Tracker_1.5.3_amd64.AppImage'));
  await rm(path.join(root, 'linux/appimage/Expense.Tracker_1.5.3_amd64.AppImage.sig'));
  await writeArtifact(root, 'linux/appimage/Expense.Tracker_1.5.2_amd64.AppImage');
  await writeArtifact(root, 'linux/appimage/Expense.Tracker_1.5.2_amd64.AppImage.sig', 'old-signature');

  await assert.rejects(generate(root), /linux-x86_64.*version.*1\.5\.2/i);
});

test('rejects a tag that disagrees with checked-out package metadata', async () => {
  const root = await completeArtifacts();

  await assert.rejects(generate(root, { packageVersion: '1.5.2' }), /tag.*package version/i);
});

test('rejects an updater bundle that advertises the wrong architecture', async () => {
  const root = await completeArtifacts();
  await rm(path.join(root, 'macos/macos/Expense.Tracker.app.tar.gz'));
  await rm(path.join(root, 'macos/macos/Expense.Tracker.app.tar.gz.sig'));
  await writeArtifact(root, 'macos/macos/Expense.Tracker_1.5.3_x64.app.tar.gz');
  await writeArtifact(root, 'macos/macos/Expense.Tracker_1.5.3_x64.app.tar.gz.sig', 'wrong-architecture-signature');

  await assert.rejects(generate(root), /darwin-aarch64.*architecture/i);
});

test('normalizes build output names before publishing assets and manifest URLs', async () => {
  const root = await completeArtifacts();
  await rm(path.join(root, 'windows/nsis/Expense.Tracker_1.5.3_x64-setup.exe'));
  await rm(path.join(root, 'windows/nsis/Expense.Tracker_1.5.3_x64-setup.exe.sig'));
  await writeArtifact(root, 'windows/nsis/Expense Tracker_1.5.3_x64-setup.exe');
  await writeArtifact(root, 'windows/nsis/Expense Tracker_1.5.3_x64-setup.exe.sig', 'windows-signature\n');
  await assert.rejects(generate(root), /not normalized/i);
  await normalizeReleaseAssetNames(path.join(root, 'windows'));

  const names = await readdir(path.join(root, 'windows/nsis'));
  assert.ok(names.includes('Expense.Tracker_1.5.3_x64-setup.exe'));
  assert.ok(names.includes('Expense.Tracker_1.5.3_x64-setup.exe.sig'));
  assert.equal((await generate(root)).platforms['windows-x86_64'].url.endsWith('Expense.Tracker_1.5.3_x64-setup.exe'), true);
});

test('rejects normalized release asset name collisions', async () => {
  const root = await completeArtifacts();
  await writeArtifact(root, 'windows/nsis/Expense Tracker_1.5.3_x64-setup.exe');

  await assert.rejects(normalizeReleaseAssetNames(path.join(root, 'windows')), /collision/i);
});

test('CLI writes latest.json only after validating downloaded artifacts', async () => {
  const root = await completeArtifacts();
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: '1.5.3' }));
  const env = {
    ...process.env,
    RELEASE_ARTIFACTS_DIR: root,
    RELEASE_TAG: 'v1.5.3',
    GITHUB_REPOSITORY: 'AlexFJ498/expense-tracker',
  };

  await execFileAsync(process.execPath, [scriptPath], { cwd: root, env });
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'latest.json'), 'utf8')), await generate(root));

  await rm(path.join(root, 'latest.json'));
  await rm(path.join(root, 'linux/appimage/Expense.Tracker_1.5.3_amd64.AppImage.sig'));
  await assert.rejects(execFileAsync(process.execPath, [scriptPath], { cwd: root, env }));
  await assert.rejects(readFile(path.join(root, 'latest.json'), 'utf8'), /ENOENT/);
});

test('CLI derives the release tag from package metadata during manual validation', async () => {
  const root = await completeArtifacts();
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: '1.5.3' }));
  const env = {
    ...process.env,
    RELEASE_ARTIFACTS_DIR: root,
    GITHUB_REPOSITORY: 'AlexFJ498/expense-tracker',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  };
  delete env.RELEASE_TAG;

  await execFileAsync(process.execPath, [scriptPath], { cwd: root, env });
  const manifest = JSON.parse(await readFile(path.join(root, 'latest.json'), 'utf8'));
  assert.equal(manifest.version, '1.5.3');
  assert.ok(manifest.platforms['windows-x86_64'].url.includes('/releases/download/v1.5.3/'));
});
