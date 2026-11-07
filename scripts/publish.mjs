/**
 * Publishes the working tree to GitHub through the REST API.
 *
 * `git push` needs https://github.com, which is frequently unreachable from
 * networks where only api.github.com resolves properly, so this script talks to
 * the API directly: blobs -> tree -> commit -> ref. No git binary required.
 *
 * Usage:
 *   node scripts/publish.mjs "feat: show share count"
 *   node scripts/publish.mjs "chore: release 0.1.1" --release
 *
 * Token: GITHUB_TOKEN env var, or --token-file=<path> (default: ../tools/gh/token.txt).
 */

import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const API = 'https://api.github.com';
const REPO = 'dsh-attachment-cache';
const BRANCH = 'main';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const ROOT_FILES = [
  'package.json',
  'cordis.patch.yml',
  'index.js',
  'client.js',
  'icon.svg',
  'README.md',
  'README.zh.md',
  'LICENSE',
  'CHANGELOG.md',
  '.gitignore',
  'market/dsh-attachment-cache.yml',
  'assets/icon-180.png',
];
const SCAN_DIRS = ['locale', 'scripts', 'market'];
const SCAN_EXT = new Set(['.json', '.yml', '.yaml', '.mjs', '.js']);

const args = process.argv.slice(2);
const message = args.find((a) => !a.startsWith('--')) ?? 'chore: sync';
const tokenFileArg = args.find((a) => a.startsWith('--token-file='));
const wantRelease = args.includes('--release');

const token = await resolveToken();
if (!token) {
  console.error('No token. Set GITHUB_TOKEN or pass --token-file=<path>.');
  process.exit(1);
}

async function resolveToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const path = tokenFileArg ? tokenFileArg.split('=')[1] : join(ROOT, '..', 'tools', 'gh', 'token.txt');
  try {
    return (await readFile(path, 'utf8')).trim();
  } catch {
    return '';
  }
}

async function api(method, path, body, { raw = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'dsh-attachment-cache-publisher',
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  if (!res.ok) {
    const error = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    error.status = res.status;
    throw error;
  }
  return raw ? text : text ? JSON.parse(text) : null;
}

function posix(path) {
  return path.split('\\').join('/');
}

async function collectFiles() {
  const files = [];
  for (const path of ROOT_FILES) {
    try {
      files.push({ path, content: await readFile(join(ROOT, path)) });
    } catch {
      // optional file missing: skip
    }
  }
  for (const dir of SCAN_DIRS) {
    let entries;
    try {
      entries = await readdir(join(ROOT, dir), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!SCAN_EXT.has(entry.name.slice(entry.name.lastIndexOf('.')))) continue;
      const rel = posix(relative(ROOT, join(ROOT, dir, entry.name)));
      if (files.some((f) => f.path === rel)) continue;
      files.push({ path: rel, content: await readFile(join(ROOT, dir, entry.name)) });
    }
  }
  return files;
}

const me = await api('GET', '/user');
const owner = me.login;
console.log(`token ok: ${owner}`);

let repo;
try {
  repo = await api('GET', `/repos/${owner}/${REPO}`);
  console.log(`repo exists: ${repo.full_name} (default branch ${repo.default_branch})`);
} catch (error) {
  if (error.status !== 404) throw error;
  repo = await api('POST', '/user/repos', {
    name: REPO,
    description: 'Browse, prune and relocate the durable attachment store that DeepSeek Harness keeps under ~/.dsh/attachments.',
    homepage: `https://github.com/${owner}/${REPO}`,
    private: false,
    has_issues: true,
    has_wiki: false,
    has_projects: false,
    auto_init: false,
  });
  console.log(`repo created: ${repo.full_name}`);
}

const files = await collectFiles();
console.log(`files: ${files.length}`);

let head = null;
try {
  head = await api('GET', `/repos/${owner}/${REPO}/git/ref/heads/${BRANCH}`);
} catch (error) {
  // An empty repository answers 409 "Git Repository is empty." instead of 404.
  if (error.status !== 404 && error.status !== 409) throw error;
}

// The Git Data API refuses to create blobs in a repository with no commits, so
// the first file goes in through the Contents API, which initializes it.
if (!head) {
  const seed = files.find((file) => file.path === 'README.md') ?? files[0];
  await api('PUT', `/repos/${owner}/${REPO}/contents/${seed.path}`, {
    message: 'chore: initialize repository',
    content: seed.content.toString('base64'),
  });
  head = await api('GET', `/repos/${owner}/${REPO}/git/ref/heads/${BRANCH}`);
  console.log(`initialized repository with ${seed.path}`);
}

const blobs = [];
for (const file of files) {
  const blob = await api('POST', `/repos/${owner}/${REPO}/git/blobs`, {
    content: file.content.toString('base64'),
    encoding: 'base64',
  });
  blobs.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
}

const tree = await api('POST', `/repos/${owner}/${REPO}/git/trees`, { tree: blobs });

if (head && head.object.sha) {
  const parent = await api('GET', `/repos/${owner}/${REPO}/git/commits/${head.object.sha}`);
  if (parent.tree.sha === tree.sha) {
    console.log('nothing to publish: remote tree already matches');
    process.exit(0);
  }
}

const commit = await api('POST', `/repos/${owner}/${REPO}/git/commits`, {
  message,
  tree: tree.sha,
  parents: head && head.object.sha ? [head.object.sha] : [],
});

if (head) {
  await api('PATCH', `/repos/${owner}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
} else {
  await api('POST', `/repos/${owner}/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: commit.sha });
}

await api('PUT', `/repos/${owner}/${REPO}/topics`, {
  names: ['dsh', 'dsh-plugin', 'deepseek-harness', 'attachments', 'storage', 'cache'],
});

console.log(`published ${commit.sha.slice(0, 7)} -> https://github.com/${owner}/${REPO}/commit/${commit.sha}`);

if (wantRelease) {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const tag = `v${pkg.version}`;
  try {
    await api('POST', `/repos/${owner}/${REPO}/releases`, {
      tag_name: tag,
      name: tag,
      body: `Release ${tag}. See CHANGELOG.md.`,
      draft: false,
      prerelease: false,
    });
    console.log(`release created: ${tag}`);
  } catch (error) {
    console.log(`release skipped: ${error.message}`);
  }
}
