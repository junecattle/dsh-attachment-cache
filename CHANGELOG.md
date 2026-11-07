# Changelog

## 0.1.0 — 2026-11-08

First public release.

- Sidebar panel listing every object in `~/.dsh/attachments/v1`, grouped by the conversation that references it, with image/document/other tabs and unreferenced-object sweep.
- Search across file names, extensions and owning conversation titles; extension filter.
- Per-file impact explanation (share count, what breaks after deletion) before any destructive action.
- Batch selection: whole group, current filter, or manual, with a confirmation dialog and a freed-bytes report.
- Derived-cache cleanup for `~/.dsh/cache/attachments`.
- Storage relocation through an NTFS directory junction: copy → digest-level verification → junction swap, in `move`, `keep-backup` or `switch` mode, with progress polling and one-click undo.
- Host half reads session logs from disk (zstd multi-frame) instead of calling the live `sessionPersistence` service, and never lets a rejected promise escape a route handler.
