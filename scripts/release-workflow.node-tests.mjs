import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
const jobs = Object.fromEntries(
  [...workflow.matchAll(/^  ([a-z-]+):\n([\s\S]*?)(?=^  [a-z-]+:\n|(?![\s\S]))/gm)]
    .map(([, name, body]) => [name, body]),
);

test('pull requests run meaningful checks without signing secrets', () => {
  assert.match(workflow, /^  pull_request:/m);
  assert.match(jobs.test, /npm ci/);
  assert.match(jobs.test, /npm test/);
  assert.match(jobs.test, /npm run build/);
  assert.match(jobs.test, /node --test scripts\/\*\.node-tests\.mjs/);
  assert.doesNotMatch(jobs.test, /TAURI_SIGNING_PRIVATE_KEY|secrets\./);
  assert.match(jobs.build, /if:.*github\.event_name == 'push'.*github\.event_name == 'workflow_dispatch'.*github\.ref == 'refs\/heads\/main'/);
});

test('manual preflight validates signed artifacts but only tags publish', () => {
  assert.match(workflow, /^  workflow_dispatch:/m);
  assert.match(jobs.build, /TAURI_SIGNING_PRIVATE_KEY:/);
  assert.match(jobs.validate, /needs: build/);
  assert.match(jobs.validate, /release-manifest\.mjs/);
  assert.match(jobs.release, /needs: validate/);
  assert.match(jobs.release, /if: github\.event_name == 'push'/);
});
