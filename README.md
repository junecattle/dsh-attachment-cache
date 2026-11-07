# dsh-attachment-cache

<img src="assets/icon-180.png" width="64" align="right" alt="">

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/dsh-%E2%89%A5%200.2.1-4f46e5.svg)](https://github.com/deepseek-ai/deepseek-harness)

English | [中文](README.zh.md)

A sidebar panel for DeepSeek Harness that shows what is stored in `~/.dsh/attachments`, grouped by conversation, and lets you delete it deliberately — with a one-line explanation of what each deletion breaks — or move the whole store to another disk without losing old conversations.

## Why this exists

Every image and file you attach to a conversation — and every image a tool hands back — is written to `~/.dsh/attachments/v1` as an immutable, content-addressed object (`objects/<sha256>` for normalized images, `file-objects/<sha256>` plus a `files/<sha256>/<name>` hardlink for files). The harness never removes them: there is no garbage collector, no retention policy, no eviction. Quitting `dsh` does not touch the folder either, so it only ever grows. A handful of conversations with TIFFs, PDFs or screenshots can add gigabytes.

Nothing in DSH's UI tells you which conversation owns which bytes, or what happens if you delete a file by hand. This plugin does.

## Features

- **Per-conversation inventory.** Every stored object mapped back to the conversations that reference it, grouped by category (images, documents, other) with the owning message as the group title.
- **Explain-before-delete.** Selecting a row explains what the file is, how many conversations share it, and exactly what stops working if it is removed — attachments are content-addressed, so one object can serve many conversations.
- **Batch selection.** Per group (全选本组), per current filter (全选当前), or click-by-click, then one confirmed delete.
- **Unreferenced sweep.** Objects no session references anymore are listed separately so you can reclaim them safely.
- **Derived-cache cleanup.** `~/.dsh/cache/attachments` (request images) is regenerable; clear it whenever you like.
- **Storage relocation.** Copy the store to another disk, verify every digest, then swap the folder for an NTFS junction — old conversations keep resolving because their references are content hashes, not paths. Three modes (move / keep a backup / switch to an existing store) and a one-click undo.
- **Read-only toward sessions.** The panel never modifies session logs; it only reads them to learn which digest belongs to which conversation.

## Install

```sh
dsh plugin --profile web add github:junecattle/dsh-attachment-cache
```

Restart DSH, open **Settings → Plugins**, enable **Attachment cache manager**, then click the archive icon in the sidebar.

Updating later:

```sh
dsh plugin --profile web add github:junecattle/dsh-attachment-cache
```

## Using the panel

| Area | What it does |
| --- | --- |
| Tabs | `全部`, `图片`, `文档`, `其他`, `无引用` — each with a live count |
| Search | Matches file name, extension, or the conversation title that owns the file |
| Extension filter | Comma-separated suffixes, e.g. `tif,pdf` |
| 全选当前 | Selects everything currently visible (including collapsed groups) |
| 展开全部 / 收起全部 | Opens or folds every conversation card |
| 存储位置 | Opens the relocation dialog |
| 重新扫描 | Re-reads the store and session logs |
| 删除选中 | Confirms, then deletes the selected objects |

Hovering a file shows its size, digest, share count and the consequence of deleting it; clicking pins it in the detail pane with a preview for PNG/JPEG/GIF/WebP.

## What deletion actually breaks

| Deleted | Effect |
| --- | --- |
| An image object | That image no longer renders in every conversation that used it. Text and tool output stay. |
| A file object | The original file can no longer be re-downloaded or re-read by a later turn; the alias under `files/` disappears too. |
| A `files/<sha>/<name>` alias | Only that display name goes away; the object survives for other names. |
| `~/.dsh/cache/attachments` | Nothing permanent — request images are regenerated on demand. |
| Unreferenced objects | Nothing; no session points at them. |

Deletion is permanent (no recycle bin), which is why the panel shows the impact first and asks once more before removing anything.

## Moving the store to another disk

`~/.dsh/attachments/v1` stays the logical path — the harness config and every stored reference keep working — but the bytes can live elsewhere:

1. `存储位置 → 选择目标文件夹` (e.g. `D:\dsh-attachments`).
2. Pick a mode:
   - **移动 (move)** — copy, verify digest by digest, delete the old copy, leave a junction. Frees the space on `C:`.
   - **保留副本 (keep)** — same, but the old folder is renamed to `v1.backup-<timestamp>` instead of deleted.
   - **切换 (switch)** — point at a folder that already holds a store, without copying.
3. Progress runs in the background (`files / bytes / phase`); the panel can be closed and reopened.
4. **还原** copies the data back, removes the junction, and restores the plain folder.

Notes:

- Junctions are a Windows feature; relocation is tested on Windows 11 with Node 22+. The store must stay on a local NTFS volume.
- A junction is transparent to `dsh`, but a backup tool that does not follow reparse points will see an empty folder.
- The derived cache under `~/.dsh/cache` deliberately stays on `C:`; it is small and regenerable.
- If the target disk disappears, attachment reads fail until the junction is restored — the panel reports this instead of hiding it.

## How it works

- **Host half** (`index.js`) registers routes under `/attachment-cache-manager`, guarded by the host's connection fence, and reads:
  - the attachment store (`objects`, `file-objects`, `files`, `request-images`),
  - session logs (`~/.dsh/sessions/<workspace>/<session>/session.v4.jsonl.zstd`, zstd multi-frame) purely to map `sha256:<digest>` references to conversations.
- **Client half** (`client.js`) registers a `sidebar.panellist` icon and a keyed `main` page; all visible text goes through the client locale.
- Deletions only happen through an explicit `POST /delete` after the confirmation dialog.

The plugin never calls into DSH's attachment service internals and never writes to session logs, so a DSH update cannot corrupt the store through it.

## Compatibility

- DeepSeek Harness ≥ 0.2.1, `web` profile
- Node ≥ 20 (`zlib.zstdDecompress` for session logs)
- Windows 11 for storage relocation; browsing and deletion are platform-neutral

## Privacy

Everything is local. The panel reads files under `~/.dsh` and serves previews over the authenticated localhost route of your own DSH instance; nothing is uploaded anywhere.

## Development

```sh
npm run check     # syntax-check index.js and client.js as ESM
node scripts/publish.mjs "feat: ..."   # publish the working tree to GitHub (REST API, no git needed)
```

Layout:

```
index.js            host half: inventory, delete, relocation routes
client.js           client half: sidebar icon + panel page
locale/{en,zh}.json plugin display metadata
icon.svg            sidebar icon
cordis.patch.yml    bundle patch
market/             catalog entry submitted to awesome-dsh-plugin
scripts/            check + publish helpers
```

## License

[MIT](LICENSE)
