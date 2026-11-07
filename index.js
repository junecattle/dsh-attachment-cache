import {
  chmod,
  copyFile,
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  rmdir,
  stat,
  statfs,
  symlink,
  unlink,
  writeFile
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { zstdDecompressSync } from 'node:zlib';

/**
 * Read-only inventory plus explicit deletion for the Harness attachment store.
 *
 * Everything here is deliberately self-contained: the inventory reads the
 * session logs and the attachment directory straight from disk instead of
 * going through the session runtime, and every entry point is wrapped so a
 * failure can only ever answer one HTTP request — never the process.
 */

export const inject = ['webServer'];

const ROUTE_PREFIX = '/attachment-cache-manager';
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const MAX_BODY_BYTES = 128 * 1024;
const MAX_PREVIEW_BYTES = 48 * 1024 * 1024;
const MAX_SESSION_BYTES = 96 * 1024 * 1024;
const MAX_WALK_NODES = 200000;
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const CACHE_TTL_MS = 15000;

const DOC_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'markdown', 'tex', 'bib', 'ris',
  'csv', 'tsv', 'json', 'jsonl', 'xml', 'yaml', 'yml', 'html', 'htm',
  'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp', 'epub', 'ipynb', 'm', 'py', 'r', 'js', 'ts'
]);

const MEDIA_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

function errorText(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function dshHomeDir() {
  const configured = process.env.DSH_HOME;
  if (typeof configured === 'string' && configured.trim() !== '') {
    return resolve(configured.trim().replace(/^~(?=$|[\\/])/, homedir()));
  }
  return resolve(join(homedir(), '.dsh'));
}

async function readDirectory(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries;
  } catch {
    return [];
  }
}

async function statOrUndefined(path) {
  try {
    return await stat(path);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- stored objects

async function listObjects(base) {
  const found = new Map();
  for (const shard of await readDirectory(base)) {
    if (!shard.isDirectory()) continue;
    const shardPath = join(base, shard.name);
    for (const entry of await readDirectory(shardPath)) {
      if (!entry.isFile()) continue;
      if (!DIGEST_PATTERN.test(entry.name)) continue;
      const info = await statOrUndefined(join(shardPath, entry.name));
      if (info === undefined) continue;
      found.set(entry.name, { bytes: info.size, mtimeMs: info.mtimeMs });
    }
  }
  return found;
}

async function listAliases(root) {
  const aliases = new Map();
  const base = join(root, 'files');
  for (const shard of await readDirectory(base)) {
    if (!shard.isDirectory()) continue;
    const shardPath = join(base, shard.name);
    for (const digestEntry of await readDirectory(shardPath)) {
      if (!digestEntry.isDirectory()) continue;
      if (!DIGEST_PATTERN.test(digestEntry.name)) continue;
      const aliasDir = join(shardPath, digestEntry.name);
      const names = [];
      let bytes = 0;
      let mtimeMs = 0;
      for (const file of await readDirectory(aliasDir)) {
        if (!file.isFile()) continue;
        const info = await statOrUndefined(join(aliasDir, file.name));
        if (info === undefined) continue;
        names.push({ name: file.name, bytes: info.size, mtimeMs: info.mtimeMs });
        bytes += info.size;
        mtimeMs = Math.max(mtimeMs, info.mtimeMs);
      }
      if (names.length > 0) aliases.set(digestEntry.name, { names, bytes, mtimeMs });
    }
  }
  return aliases;
}

async function walkFiles(base, maxDepth) {
  const files = [];
  const pending = [{ path: base, depth: 0 }];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of await readDirectory(current.path)) {
      const path = join(current.path, entry.name);
      if (entry.isDirectory()) {
        if (current.depth < maxDepth) pending.push({ path, depth: current.depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;
      const info = await statOrUndefined(path);
      if (info === undefined) continue;
      files.push({ path, bytes: info.size, mtimeMs: info.mtimeMs });
    }
  }
  return files;
}

// ------------------------------------------------------------------- references

function walkRefs(node, visit, depth = 0, budget = { nodes: MAX_WALK_NODES }) {
  if (budget.nodes <= 0) return;
  if (node === null || typeof node !== 'object') return;
  if (depth > 24) return;
  budget.nodes -= 1;
  if (Array.isArray(node)) {
    for (const item of node) walkRefs(item, visit, depth + 1, budget);
    return;
  }
  if (typeof node.attachmentId === 'string' && node.attachmentId.startsWith('sha256:')) visit(node);
  for (const key of Object.keys(node)) walkRefs(node[key], visit, depth + 1, budget);
}

function extensionOf(name) {
  if (typeof name !== 'string') return '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

function mediaExtension(mediaType) {
  return typeof mediaType === 'string' ? (MEDIA_EXTENSIONS[mediaType] ?? '') : '';
}

function bucketOf(kind, ext) {
  if (kind === 'image') return 'image';
  if (DOC_EXTENSIONS.has(ext)) return 'doc';
  return 'other';
}

// ------------------------------------------------------------------ session logs

function zstdFrameOffsets(buffer) {
  const offsets = [];
  let index = 0;
  while ((index = buffer.indexOf(ZSTD_MAGIC, index)) !== -1) {
    offsets.push(index);
    index += 1;
  }
  return offsets;
}

/**
 * A session log is a chain of independent zstd frames: the first holds the
 * header line, the rest hold JSONL event batches. Node decodes one frame per
 * call, so each frame start is decoded on its own and merged by `seq`.
 */
async function readSessionLog(file, sizeBytes) {
  if (sizeBytes > MAX_SESSION_BYTES) return undefined;
  const raw = await readFile(file);
  const records = new Map();
  let header;
  for (const offset of zstdFrameOffsets(raw)) {
    let text;
    try {
      text = zstdDecompressSync(raw.subarray(offset)).toString('utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (line === '') continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (record === null || typeof record !== 'object') continue;
      if (record.type === 'session') {
        header ??= record;
        continue;
      }
      if (typeof record.seq !== 'number') continue;
      records.set(record.seq, record);
    }
  }
  const events = [...records.values()].sort((left, right) => left.seq - right.seq);
  return { header, events };
}

function titleOfEvents(events) {
  for (const event of events) {
    if (event.type !== 'user/message') continue;
    const content = event.data?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== 'text' || typeof block.text !== 'string') continue;
      const text = block.text.replace(/\s+/g, ' ').trim();
      if (text === '') continue;
      return text.length > 72 ? `${text.slice(0, 72)}…` : text;
    }
  }
  return undefined;
}

async function listSessionLogs(home) {
  const base = join(home, 'sessions');
  const logs = [];
  for (const workspace of await readDirectory(base)) {
    if (!workspace.isDirectory()) continue;
    const workspacePath = join(base, workspace.name);
    for (const session of await readDirectory(workspacePath)) {
      if (!session.isDirectory()) continue;
      const dir = join(workspacePath, session.name);
      for (const name of ['session.v4.jsonl.zstd', 'session.v3.jsonl.zstd', 'session.jsonl.zstd']) {
        const file = join(dir, name);
        const info = await statOrUndefined(file);
        if (info === undefined) continue;
        logs.push({ id: session.name, file, sizeBytes: info.size, mtimeMs: info.mtimeMs });
        break;
      }
    }
  }
  logs.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return logs;
}

// --------------------------------------------------------------------- inventory

async function buildState() {
  const startedAt = Date.now();
  const home = dshHomeDir();
  const root = join(home, 'attachments', 'v1');
  const cacheRoot = join(home, 'cache', 'attachments');
  const warnings = [];

  if (typeof zstdDecompressSync !== 'function') {
    warnings.push('this Node runtime cannot decode zstd session logs: conversation mapping unavailable');
  }

  const storage = await inspectStorage(home);
  const images = await listObjects(join(root, 'objects'));
  const fileObjects = await listObjects(join(root, 'file-objects'));
  const aliases = await listAliases(root);
  const requestImages = await walkFiles(join(root, 'request-images'), 3);
  const cacheFiles = await walkFiles(cacheRoot, 3);

  const sessions = [];
  const referenceIndex = new Map();

  const logs = typeof zstdDecompressSync === 'function'
    ? await listSessionLogs(home)
    : [];

  for (const log of logs) {
    let decoded;
    try {
      decoded = await readSessionLog(log.file, log.sizeBytes);
    } catch (error) {
      warnings.push(`cannot read ${log.id.slice(0, 8)}: ${errorText(error)}`);
      continue;
    }
    if (decoded === undefined) {
      warnings.push(`skipped oversized log ${log.id.slice(0, 8)}`);
      continue;
    }

    const { header, events } = decoded;
    const id = typeof header?.id === 'string' ? header.id : log.id;

    const items = new Map();
    let occurrences = 0;
    for (const record of events) {
      if (record.type === 'turn/start' || record.type === 'step/start' || record.type === 'step/end') continue;
      walkRefs(record.data, (ref) => {
        occurrences += 1;
        const digest = ref.attachmentId.slice('sha256:'.length).toLowerCase();
        if (!DIGEST_PATTERN.test(digest)) return;
        const kind = typeof ref.mediaType === 'string' && ref.mediaType.startsWith('image/') ? 'image' : 'file';
        const existing = items.get(digest);
        if (existing !== undefined) {
          existing.refs += 1;
          if (existing.name === undefined && typeof ref.name === 'string') existing.name = ref.name;
          return;
        }
        items.set(digest, {
          digest,
          kind,
          mediaType: ref.mediaType,
          name: typeof ref.name === 'string' ? ref.name : undefined,
          refBytes: typeof ref.bytes === 'number' ? ref.bytes : undefined,
          refs: 1
        });
        const indexed = referenceIndex.get(digest);
        if (indexed === undefined) {
          referenceIndex.set(digest, { sessionIds: new Set([id]), count: 1 });
        } else {
          indexed.count += 1;
          indexed.sessionIds.add(id);
        }
      });
    }

    const resolved = [];
    let sessionBytes = 0;
    for (const entry of items.values()) {
      const object = entry.kind === 'image' ? images.get(entry.digest) : fileObjects.get(entry.digest);
      const alias = aliases.get(entry.digest);
      const stored = object !== undefined || alias !== undefined;
      const name = entry.name
        ?? alias?.names?.[0]?.name
        ?? (entry.kind === 'image' ? `image-${entry.digest.slice(0, 8)}` : `file-${entry.digest.slice(0, 8)}`);
      const ext = extensionOf(name) || mediaExtension(entry.mediaType);
      const bytes = object?.bytes ?? alias?.bytes ?? entry.refBytes ?? 0;
      sessionBytes += bytes;
      resolved.push({
        digest: entry.digest,
        kind: entry.kind,
        bucket: bucketOf(entry.kind, ext),
        name,
        ext,
        mediaType: entry.mediaType,
        bytes,
        stored,
        refs: entry.refs,
        aliasCount: alias?.names?.length ?? 0,
        mtimeMs: object?.mtimeMs ?? alias?.mtimeMs ?? header?.createdAt ?? log.mtimeMs ?? 0
      });
    }
    resolved.sort((left, right) => right.bytes - left.bytes);
    if (resolved.length === 0) continue;

    sessions.push({
      id,
      title: titleOfEvents(events),
      createdAt: typeof header?.createdAt === 'number' ? header.createdAt : undefined,
      cwd: typeof header?.cwd === 'string' ? header.cwd : undefined,
      isSubagent: header?.origin === 'subagent',
      sizeBytes: log.sizeBytes,
      eventCount: events.length,
      occurrences,
      items: resolved,
      bytes: sessionBytes
    });
  }

  const orphans = [];
  const all = new Map();
  for (const [digest, entry] of images) all.set(digest, { kind: 'image', entry });
  for (const [digest, entry] of fileObjects) all.set(digest, { kind: 'file', entry });

  let referencedBytes = 0;
  for (const [digest, reference] of referenceIndex) {
    const stored = images.get(digest) ?? fileObjects.get(digest);
    if (stored !== undefined) referencedBytes += stored.bytes;
    void reference;
  }

  for (const [digest, record] of all) {
    if (referenceIndex.has(digest)) continue;
    const alias = aliases.get(digest);
    const name = alias?.names?.[0]?.name ?? `${record.kind}-${digest.slice(0, 8)}`;
    const ext = extensionOf(name) || (record.kind === 'image' ? 'png' : '');
    orphans.push({
      digest,
      kind: record.kind,
      bucket: bucketOf(record.kind, ext),
      name,
      ext,
      mediaType: record.kind === 'image' ? 'image/png' : undefined,
      bytes: record.entry.bytes,
      stored: true,
      refs: 0,
      aliasCount: alias?.names?.length ?? 0,
      mtimeMs: record.entry.mtimeMs,
      orphan: true
    });
  }
  orphans.sort((left, right) => right.mtimeMs - left.mtimeMs);

  const imageBytes = [...images.values()].reduce((total, entry) => total + entry.bytes, 0);
  const fileBytes = [...fileObjects.values()].reduce((total, entry) => total + entry.bytes, 0);
  const aliasApparentBytes = [...aliases.values()].reduce((total, entry) => total + entry.bytes, 0);
  const derivedBytes = [...requestImages, ...cacheFiles].reduce((total, entry) => total + entry.bytes, 0);

  let danglingCount = 0;
  for (const session of sessions) {
    for (const item of session.items) {
      if (!item.stored) danglingCount += 1;
    }
  }

  return {
    home,
    paths: { root, cacheRoot, realRoot: storage.realRoot ?? root },
    storage,
    scannedAt: Date.now(),
    elapsedMs: Date.now() - startedAt,
    totals: {
      sessions: sessions.length,
      storedBytes: imageBytes + fileBytes,
      imageBytes,
      fileBytes,
      imageCount: images.size,
      fileCount: fileObjects.size,
      aliasApparentBytes,
      referencedBytes,
      orphanCount: orphans.length,
      orphanBytes: orphans.reduce((total, item) => total + item.bytes, 0),
      danglingCount,
      derivedBytes,
      derivedCount: requestImages.length + cacheFiles.length,
      requestImageBytes: requestImages.reduce((total, entry) => total + entry.bytes, 0),
      cacheBytes: cacheFiles.reduce((total, entry) => total + entry.bytes, 0),
      itemCount: sessions.reduce((total, session) => total + session.items.length, 0)
    },
    sessions,
    orphans,
    derived: {
      requestImages: requestImages.length,
      requestImageBytes: requestImages.reduce((total, entry) => total + entry.bytes, 0),
      cacheFiles: cacheFiles.length,
      cacheBytes: cacheFiles.reduce((total, entry) => total + entry.bytes, 0)
    },
    warnings
  };
}

let cacheState;
let cacheAt = 0;
let inflight;

async function stateCached() {
  const now = Date.now();
  if (cacheState !== undefined && now - cacheAt < CACHE_TTL_MS) return cacheState;
  if (inflight !== undefined) return inflight;
  inflight = buildState()
    .then((state) => {
      cacheState = state;
      cacheAt = Date.now();
      return state;
    })
    .finally(() => {
      inflight = undefined;
    });
  return inflight;
}

function invalidateState() {
  cacheState = undefined;
  cacheAt = 0;
}

// ----------------------------------------------------------------------- deletion

async function removeDigests(root, digests) {
  const removed = [];
  const failed = [];
  let freedBytes = 0;

  for (const digest of digests) {
    if (!DIGEST_PATTERN.test(digest)) {
      failed.push({ digest, error: 'invalid digest' });
      continue;
    }
    const shard = digest.slice(0, 2);
    const targets = [
      join(root, 'objects', shard, digest),
      join(root, 'file-objects', shard, digest),
      join(root, 'files', shard, digest)
    ];
    let bytes = 0;
    let touched = false;
    for (const target of targets) {
      const info = await statOrUndefined(target);
      if (info === undefined) continue;
      bytes = Math.max(bytes, info.size);
      try {
        await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 60 });
        touched = true;
      } catch (error) {
        failed.push({ digest, error: errorText(error) });
      }
    }
    if (touched) {
      freedBytes += bytes;
      removed.push({ digest, bytes, removed: true });
    }
  }

  // Prune empty digests that a partial delete may have left behind.
  for (const shard of await readDirectory(join(root, 'files'))) {
    if (!shard.isDirectory()) continue;
    const shardPath = join(root, 'files', shard.name);
    for (const entry of await readDirectory(shardPath)) {
      if (!entry.isDirectory()) continue;
      const path = join(shardPath, entry.name);
      const left = await readDirectory(path);
      if (left.length > 0) continue;
      await rm(path, { recursive: true, force: true }).catch(() => {});
    }
  }

  return { removed, failed, freedBytes };
}

async function clearDerived(root, cacheRoot) {
  const targets = [
    join(root, 'request-images'),
    join(cacheRoot, 'request-images')
  ];
  const failed = [];
  let freedBytes = 0;
  for (const target of targets) {
    const files = await walkFiles(target, 6);
    for (const file of files) freedBytes += file.bytes;
    try {
      await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 60 });
    } catch (error) {
      failed.push({ target, error: errorText(error) });
    }
  }
  return { freedBytes, failed };
}

// ----------------------------------------------------------------------- storage

const STORE_PARTS = ['objects', 'file-objects', 'request-images'];

async function lstatOrUndefined(path) {
  try {
    return await lstat(path);
  } catch {
    return undefined;
  }
}

function cleanLinkTarget(value) {
  if (typeof value !== 'string') return null;
  return value.replace(/^\\\\\?\\/, '').replace(/^\\\?\?\\/, '');
}

async function inspectStorage(home) {
  const root = join(home, 'attachments', 'v1');
  const cacheRoot = join(home, 'cache', 'attachments');
  const rootInfo = await lstatOrUndefined(root);
  const cacheInfo = await lstatOrUndefined(cacheRoot);
  const record = await readLinkRecord(home);
  const rootExists = rootInfo !== undefined;
  const rootIsLink = rootExists && record !== null;
  const cacheIsLink = cacheInfo !== undefined && cacheInfo.isSymbolicLink();
  return {
    home,
    root,
    cacheRoot,
    rootExists,
    rootIsLink,
    rootLinkTarget: rootIsLink ? record.target : null,
    realRoot: rootIsLink ? record.target : rootExists ? root : null,
    linkedAt: rootIsLink ? record.createdAt : null,
    cacheExists: cacheInfo !== undefined,
    cacheIsLink,
    cacheLinkTarget: cacheIsLink ? cleanLinkTarget(await readlink(cacheRoot).catch(() => null)) : null
  };
}

function linkRecordPath(home) {
  return join(home, 'attachments', 'v1.link.json');
}

async function readLinkRecord(home) {
  try {
    const text = await readFile(linkRecordPath(home), 'utf8');
    const parsed = JSON.parse(text);
    if (typeof parsed?.target === 'string' && isAbsolute(parsed.target)) {
      return { target: parsed.target, mode: parsed.mode, createdAt: parsed.createdAt };
    }
  } catch {
    /* no relocation record */
  }
  return null;
}

async function writeLinkRecord(home, target, mode) {
  const path = linkRecordPath(home);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ target, mode, createdAt: Date.now() }, null, 2), 'utf8');
}

async function deleteLinkRecord(home) {
  await rm(linkRecordPath(home), { force: true }).catch(() => {});
}

async function sameEntry(left, right) {
  try {
    const a = await stat(left, { bigint: true });
    const b = await stat(right, { bigint: true });
    return a.ino === b.ino && a.dev === b.dev;
  } catch {
    return false;
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function freeBytes(path) {
  try {
    const info = await statfs(path);
    return (info.bavail ?? info.bfree ?? 0) * (info.bsize ?? 4096);
  } catch {
    return undefined;
  }
}

async function storeTotals(root) {
  const objects = await listObjects(join(root, 'objects'));
  const fileObjects = await listObjects(join(root, 'file-objects'));
  const aliases = await listAliases(root);
  const requestImages = await walkFiles(join(root, 'request-images'), 3);
  const sum = (entries) => entries.reduce((total, entry) => total + entry.bytes, 0);
  let aliasCount = 0;
  for (const alias of aliases.values()) aliasCount += alias.names.length;
  return {
    files: objects.size + fileObjects.size + requestImages.length + aliasCount,
    bytes: sum([...objects.values()]) + sum([...fileObjects.values()]) + sum(requestImages)
  };
}

async function copyStoredFiles(source, target, job, warnings) {
  const copyOne = async (from, to, bytes) => {
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    await chmod(to, 0o400).catch(() => {});
    job.files += 1;
    job.bytes += bytes;
  };

  for (const part of STORE_PARTS) {
    const base = join(source, part);
    for (const shard of await readDirectory(base)) {
      if (!shard.isDirectory()) continue;
      for (const entry of await readDirectory(join(base, shard.name))) {
        if (!entry.isFile()) continue;
        const info = await statOrUndefined(join(base, shard.name, entry.name));
        if (info === undefined) continue;
        await copyOne(join(base, shard.name, entry.name), join(target, part, shard.name, entry.name), info.size);
      }
    }
  }

  // Aliases stay hardlinks so the copied store keeps one physical copy per digest.
  for (const shard of await readDirectory(join(source, 'files'))) {
    if (!shard.isDirectory()) continue;
    for (const digestEntry of await readDirectory(join(source, 'files', shard.name))) {
      if (!digestEntry.isDirectory()) continue;
      if (!DIGEST_PATTERN.test(digestEntry.name)) continue;
      const sourceDir = join(source, 'files', shard.name, digestEntry.name);
      const targetDir = join(target, 'files', shard.name, digestEntry.name);
      const objectPath = join(target, 'file-objects', shard.name, digestEntry.name);
      const objectExists = (await statOrUndefined(objectPath)) !== undefined;
      for (const file of await readDirectory(sourceDir)) {
        if (!file.isFile()) continue;
        await mkdir(targetDir, { recursive: true });
        const to = join(targetDir, file.name);
        if (objectExists) {
          try {
            await link(objectPath, to);
            job.files += 1;
            continue;
          } catch {
            /* fall back to a plain copy */
          }
        }
        const info = await statOrUndefined(join(sourceDir, file.name));
        if (info === undefined) continue;
        await copyOne(join(sourceDir, file.name), to, info.size);
        if (warnings !== undefined) warnings.push(`${digestEntry.name.slice(0, 8)}/${file.name}: 别名以独立副本保存`);
      }
    }
  }

  await mkdir(join(target, 'tmp'), { recursive: true });
}

async function verifyStore(source, target) {
  const problems = [];
  for (const part of ['objects', 'file-objects']) {
    const expected = await listObjects(join(source, part));
    const actual = await listObjects(join(target, part));
    for (const [digest, info] of expected) {
      const match = actual.get(digest);
      if (match === undefined) {
        problems.push(`${part}/${digest.slice(0, 12)}: 缺失`);
        continue;
      }
      if (match.bytes !== info.bytes) problems.push(`${part}/${digest.slice(0, 12)}: ${match.bytes} != ${info.bytes}`);
    }
  }
  const expectedAliases = await listAliases(source);
  const actualAliases = await listAliases(target);
  for (const [digest, alias] of expectedAliases) {
    const match = actualAliases.get(digest);
    if (match === undefined) {
      problems.push(`files/${digest.slice(0, 12)}: 缺失`);
      continue;
    }
    if (match.names.length !== alias.names.length) {
      problems.push(`files/${digest.slice(0, 12)}: 别名 ${match.names.length} != ${alias.names.length}`);
    }
  }
  return { ok: problems.length === 0, problems: problems.slice(0, 12) };
}

async function removeStoreLink(path) {
  try {
    await rmdir(path);
    return;
  } catch {
    /* a junction is often removable through unlink instead */
  }
  await unlink(path);
}

let relocateJob = null;

function newJob(kind, target, mode) {
  return {
    kind,
    target,
    mode,
    startedAt: Date.now(),
    finishedAt: null,
    phase: 'preparing',
    done: false,
    files: 0,
    totalFiles: 0,
    bytes: 0,
    totalBytes: 0,
    error: null,
    errorCode: null,
    result: null
  };
}

function publicJob() {
  if (relocateJob === null) return null;
  const job = relocateJob;
  return {
    kind: job.kind,
    target: job.target,
    mode: job.mode,
    phase: job.phase,
    done: job.done,
    files: job.files,
    totalFiles: job.totalFiles,
    bytes: job.bytes,
    totalBytes: job.totalBytes,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.error,
    errorCode: job.errorCode,
    result: job.result
  };
}

async function runRelocate(home, target, mode, job) {
  const root = join(home, 'attachments', 'v1');
  const warnings = [];
  const previous = mode === 'keep' ? `${root}.backup-${stamp()}` : `${root}.old-${stamp()}`;

  await mkdir(target, { recursive: true });
  const totals = await storeTotals(root);
  job.totalFiles = totals.files;
  job.totalBytes = totals.bytes;

  if (mode !== 'switch') {
    const free = await freeBytes(target);
    if (free !== undefined && free < totals.bytes * 1.05) {
      throw codedError('no-space', '目标位置剩余空间不足');
    }
    job.phase = 'copying';
    await copyStoredFiles(root, target, job, warnings);
    job.phase = 'verifying';
    const verdict = await verifyStore(root, target);
    if (!verdict.ok) throw codedError('verify-failed', `复制校验未通过：${verdict.problems.join('；')}`);
  } else {
    const existing = await storeTotals(target);
    if (existing.files === 0) warnings.push('目标位置为空目录，旧对话的附件将无法打开');
    job.phase = 'swapping';
  }

  job.phase = 'swapping';
  const rootInfo = await lstatOrUndefined(root);
  if (rootInfo !== undefined) await rename(root, previous);
  await mkdir(dirname(root), { recursive: true });
  try {
    await symlink(target, root, 'junction');
  } catch (error) {
    if (rootInfo !== undefined) await rename(previous, root).catch(() => {});
    throw codedError('link-failed', `无法创建目录联接：${errorText(error)}`);
  }

  if (!(await sameEntry(root, target))) {
    await removeStoreLink(root).catch(() => {});
    if (rootInfo !== undefined) await rename(previous, root).catch(() => {});
    throw codedError('link-failed', '目录联接创建后校验失败');
  }
  await writeLinkRecord(home, target, mode).catch((error) => {
    warnings.push(`联接记录写入失败：${errorText(error)}`);
  });

  if (mode === 'move' && rootInfo !== undefined) {
    job.phase = 'cleaning';
    await rm(previous, { recursive: true, force: true, maxRetries: 3, retryDelay: 60 }).catch((error) => {
      warnings.push(`原目录清理失败：${errorText(error)}`);
    });
  }

  invalidateState();
  return {
    target,
    mode,
    files: job.totalFiles,
    bytes: job.totalBytes,
    verified: mode !== 'switch',
    previous: mode === 'keep' && rootInfo !== undefined ? previous : null,
    warnings
  };
}

async function runUndo(home, job, cleanTarget) {
  const storage = await inspectStorage(home);
  if (!storage.rootIsLink) throw codedError('not-linked', '当前目录不是目录联接');
  const target = storage.rootLinkTarget;
  if (typeof target !== 'string' || target === '') throw codedError('not-linked', '无法读取联接目标');

  const restore = `${storage.root}.restore-${stamp()}`;
  const totals = await storeTotals(target);
  job.totalFiles = totals.files;
  job.totalBytes = totals.bytes;
  const free = await freeBytes(home);
  if (free !== undefined && free < totals.bytes * 1.05) throw codedError('no-space', '默认位置剩余空间不足');

  job.phase = 'copying';
  await copyStoredFiles(target, restore, job, []);
  job.phase = 'verifying';
  const verdict = await verifyStore(target, restore);
  if (!verdict.ok) {
    await rm(restore, { recursive: true, force: true }).catch(() => {});
    throw codedError('verify-failed', `回拷校验未通过：${verdict.problems.join('；')}`);
  }

  job.phase = 'swapping';
  await removeStoreLink(storage.root);
  await rename(restore, storage.root);
  await deleteLinkRecord(home);

  const warnings = [];
  if (cleanTarget === true) {
    job.phase = 'cleaning';
    for (const part of [...STORE_PARTS, 'tmp']) {
      await rm(join(target, part), { recursive: true, force: true, maxRetries: 3, retryDelay: 60 }).catch((error) => {
        warnings.push(`${part}: ${errorText(error)}`);
      });
    }
  }

  invalidateState();
  return { restored: storage.root, from: target, files: totals.files, bytes: totals.bytes, cleaned: cleanTarget === true, warnings };
}

function startJob(kind, target, mode, runner) {
  const job = newJob(kind, target, mode);
  relocateJob = job;
  runner(job)
    .then((result) => {
      job.result = result;
      job.phase = 'done';
    })
    .catch((error) => {
      job.error = errorText(error);
      job.errorCode = typeof error?.code === 'string' ? error.code : 'failed';
      job.phase = 'failed';
    })
    .then(() => {
      job.done = true;
      job.finishedAt = Date.now();
      invalidateState();
    })
    .catch(() => {
      job.done = true;
      job.finishedAt = Date.now();
    });
  return job;
}

function validateTarget(home, target) {
  if (typeof target !== 'string' || target.trim() === '') return 'invalid-target';
  if (!isAbsolute(target)) return 'invalid-target';
  const root = join(home, 'attachments', 'v1');
  const resolved = resolve(target.trim());
  if (resolved === root) return 'same-target';
  if (resolved.startsWith(root + sep)) return 'inside-target';
  if (root.startsWith(resolved + sep)) return 'inside-target';
  if (resolved === resolve(home)) return 'inside-target';
  return null;
}

// -------------------------------------------------------------------------- http

function sendJson(res, status, payload) {
  if (res.writableEnded || res.headersSent) return;
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function readBody(req) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        rejectPromise(new Error('request body too large'));
        req.destroy?.();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (total === 0) {
        resolvePromise(undefined);
        return;
      }
      try {
        resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        rejectPromise(error);
      }
    });
    req.on('error', rejectPromise);
  });
}

function detectImageType(buffer) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return undefined;
}

async function servePreview(res, home, digest) {
  if (!DIGEST_PATTERN.test(digest)) {
    sendJson(res, 400, { error: 'invalid digest' });
    return;
  }
  const path = join(home, 'attachments', 'v1', 'objects', digest.slice(0, 2), digest);
  const info = await statOrUndefined(path);
  if (info === undefined) {
    sendJson(res, 404, { error: 'not stored' });
    return;
  }
  if (info.size > MAX_PREVIEW_BYTES) {
    sendJson(res, 413, { error: 'preview too large' });
    return;
  }
  const buffer = await readFile(path);
  if (res.writableEnded) return;
  res.statusCode = 200;
  res.setHeader('content-type', detectImageType(buffer) ?? 'application/octet-stream');
  res.setHeader('cache-control', 'private, max-age=300');
  res.end(buffer);
}

/**
 * Same-origin fence. The Host's own `connection` service is consulted when it
 * is reachable and never allowed to throw; otherwise a local check keeps
 * cross-site requests out.
 */
function isRejected(ctx, req) {
  try {
    const connection = Reflect.get(ctx, 'connection');
    if (typeof connection?.requestRejection === 'function') {
      const rejection = connection.requestRejection(req);
      if (rejection !== undefined) return true;
      return false;
    }
  } catch {
    /* fall through to the local fence */
  }
  const site = req.headers['sec-fetch-site'];
  if (site === 'cross-site' || site === 'same-site') return true;
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin !== '' && origin !== 'null') {
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      return true;
    }
    if (originHost !== req.headers.host) return true;
  }
  return false;
}

async function dispatch(ctx, req, res) {
  if (isRejected(ctx, req)) {
    if (!res.writableEnded) {
      res.statusCode = 403;
      res.end();
    }
    return;
  }

  let url;
  try {
    url = new URL(req.url ?? '/', 'http://127.0.0.1');
  } catch {
    sendJson(res, 400, { error: 'bad url' });
    return;
  }

  const sub = url.pathname.slice(ROUTE_PREFIX.length) || '/';
  const home = dshHomeDir();

  if (req.method === 'GET' && sub === '/state') {
    sendJson(res, 200, await stateCached());
    return;
  }
  if (req.method === 'GET' && (sub === '/preview' || sub === '/preview.png')) {
    await servePreview(res, home, url.searchParams.get('digest') ?? '');
    return;
  }
  if (req.method === 'POST' && sub === '/delete') {
    const body = await readBody(req);
    const digests = Array.isArray(body?.digests)
      ? body.digests.filter((value) => typeof value === 'string')
      : [];
    const root = join(home, 'attachments', 'v1');
    const result = await removeDigests(root, digests);
    invalidateState();
    sendJson(res, 200, { ok: true, result, state: await stateCached() });
    return;
  }
  if (req.method === 'POST' && sub === '/clear-derived') {
    const root = join(home, 'attachments', 'v1');
    const cacheRoot = join(home, 'cache', 'attachments');
    const result = await clearDerived(root, cacheRoot);
    invalidateState();
    sendJson(res, 200, { ok: true, result, state: await stateCached() });
    return;
  }
  if (req.method === 'GET' && sub === '/relocate') {
    sendJson(res, 200, { ok: true, job: publicJob() });
    return;
  }
  if (req.method === 'POST' && sub === '/relocate') {
    if (relocateJob !== null && !relocateJob.done) {
      sendJson(res, 409, { error: 'busy', message: '已有任务在进行' });
      return;
    }
    const body = await readBody(req);
    const target = typeof body?.target === 'string' ? body.target : '';
    const mode = body?.mode === 'keep' || body?.mode === 'switch' ? body.mode : 'move';
    const problem = validateTarget(home, target);
    if (problem !== null) {
      sendJson(res, 400, { error: problem, message: '目标路径无效' });
      return;
    }
    const storage = await inspectStorage(home);
    if (storage.rootIsLink) {
      sendJson(res, 400, { error: 'already-linked', message: '当前目录已是联接，请先还原' });
      return;
    }
    const existing = await lstatOrUndefined(join(home, 'attachments', 'v1'));
    if (existing === undefined && mode !== 'switch') {
      sendJson(res, 400, { error: 'no-store', message: '当前还没有附件存储' });
      return;
    }
    const trimmed = target.trim();
    startJob('relocate', trimmed, mode, (job) => runRelocate(home, trimmed, mode, job));
    sendJson(res, 202, { ok: true, job: publicJob() });
    return;
  }
  if (req.method === 'POST' && sub === '/relocate-undo') {
    if (relocateJob !== null && !relocateJob.done) {
      sendJson(res, 409, { error: 'busy', message: '已有任务在进行' });
      return;
    }
    const body = await readBody(req);
    const storage = await inspectStorage(home);
    if (!storage.rootIsLink) {
      sendJson(res, 400, { error: 'not-linked', message: '当前目录不是目录联接' });
      return;
    }
    startJob('undo', storage.rootLinkTarget ?? '', 'restore', (job) => runUndo(home, job, body?.clean === true));
    sendJson(res, 202, { ok: true, job: publicJob() });
    return;
  }
  sendJson(res, 404, { error: 'unknown route' });
}

export function apply(ctx) {
  const handler = (req, res) => {
    try {
      dispatch(ctx, req, res).catch((error) => {
        try {
          sendJson(res, 500, { error: errorText(error) });
        } catch {
          /* the socket is gone; nothing left to answer */
        }
      });
    } catch (error) {
      try {
        sendJson(res, 500, { error: errorText(error) });
      } catch {
        /* ignore */
      }
    }
  };

  try {
    ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler }), 'attachment-cache-manager: http routes');
  } catch (error) {
    console.warn('[attachment-cache] route registration failed:', errorText(error));
  }
}
