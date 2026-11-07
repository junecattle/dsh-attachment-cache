window.__ModuleLoader__.load({
  id: '@local/attachment-cache-manager',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const NS = 'attachment-cache';
    const PANEL_ID = 'attachment-cache-manager';
    const API = '/attachment-cache-manager';

    const DICT = {
      zh: {
        'meta.title': '附件缓存管理',
        'meta.description': '按对话查看、预览并清理 attachments 目录中的图片与文件缓存',
        panel: '附件缓存',
        title: '附件缓存',
        'toolbar.tabs.all': '全部',
        'toolbar.tabs.image': '图片',
        'toolbar.tabs.doc': '文档',
        'toolbar.tabs.other': '其他',
        'toolbar.tabs.orphan': '无引用',
        'toolbar.search': '搜索名称、后缀或摘要',
        'toolbar.ext': '后缀',
        'toolbar.ext.placeholder': '如 pdf,docx',
        'toolbar.selectAll': '全选当前',
        'toolbar.selectAll.hint': '选中当前筛选结果里的全部文件（不展开也能选中）',
        'toolbar.expandAll': '展开全部',
        'toolbar.collapseAll': '收起全部',
        'toolbar.clearSelection': '取消选择',
        'toolbar.delete': '删除选中',
        'toolbar.refresh': '重新扫描',
        'storage.action': '存储位置',
        'storage.title': '附件存储位置',
        'storage.current': '当前目录',
        'storage.linked': '目录联接指向',
        'storage.notLinked': '数据就在当前目录内，未使用联接',
        'storage.target': '新位置',
        'storage.target.placeholder': '如 D:\\dsh-attachments',
        'storage.mode.move': '迁移到新位置（释放原目录）',
        'storage.mode.move.hint': '复制 → 校验 → 删除原目录，磁盘上只保留一份。',
        'storage.mode.keep': '复制到新位置，保留原目录',
        'storage.mode.keep.hint': '原目录改名为 v1.backup-…，确认无误后可手动删除。',
        'storage.mode.switch': '只切换，不复制',
        'storage.mode.switch.hint': '目标目录里必须已有一份附件，否则旧对话的图片和文件都打不开。',
        'storage.warn': '切换使用 NTFS 目录联接（junction）：dsh 仍按原路径读写，旧对话里的图片和文件照常打开，不需要重启。代价是目标磁盘一旦不可用（拔掉、盘符变化、未挂载），这些附件就读不到了。',
        'storage.start': '开始',
        'storage.cancel': '取消',
        'storage.close': '关闭',
        'storage.running': '处理中…',
        'storage.phase.preparing': '准备',
        'storage.phase.copying': '复制',
        'storage.phase.verifying': '校验',
        'storage.phase.swapping': '切换',
        'storage.phase.cleaning': '清理',
        'storage.phase.done': '完成',
        'storage.phase.failed': '失败',
        'storage.progress': '{phase} · {files}/{total} 个文件 · {done}/{size}',
        'storage.done': '已切换到 {target}。',
        'storage.undo': '还原到默认位置',
        'storage.undo.hint': '把附件复制回 ~/.dsh/attachments/v1，然后移除联接。',
        'storage.undo.clean': '还原后删除目标目录中的副本',
        'storage.undo.done': '已还原到默认位置。',
        'storage.afterKeep': '原目录副本：{path}',
        'storage.err.invalid-target': '请填写一个绝对路径，例如 D:\\dsh-attachments',
        'storage.err.inside-target': '目标目录不能是当前目录本身、它的子目录或它的上级目录',
        'storage.err.already-linked': '当前已经是联接状态，请先还原',
        'storage.err.no-space': '目标磁盘剩余空间不足',
        'storage.err.verify-failed': '复制校验未通过，已保持原状',
        'storage.err.link-failed': '无法创建目录联接',
        'storage.err.not-linked': '当前不是联接状态',
        'storage.err.busy': '已有任务在进行',
        'storage.err.no-store': '当前还没有附件存储',
        'storage.err.failed': '操作失败',
        'toolbar.clearDerived': '清理派生缓存',
        'toolbar.scanning': '扫描中…',
        'toolbar.clearing': '清理中…',
        'toolbar.deleting': '删除中…',
        'stat.stored': '磁盘占用',
        'stat.images': '图片',
        'stat.files': '文件',
        'stat.orphans': '无引用',
        'stat.derived': '派生缓存',
        'stat.sessions': '对话',
        'stat.dangling': '缺失引用',
        'stat.stored.hint': '图片 + 文件 + 派生，已按硬链接去重',
        'stat.files.count': '{count} 个文件',
        'stat.orphans.hint': '没有任何对话引用',
        'stat.derived.hint': '{count} 个可再生成的文件',
        'stat.sessions.hint': '{count} 个引用项',
        'stat.dangling.hint': '对话引用了但磁盘上找不到',
        'mix.title': '占用构成',
        'storage.change': '更改位置',
        'storage.badge.default': '默认位置',
        'storage.badge.custom': '自定义位置',
        'head.scanned': '扫描于 {time}',
        'group.orphans': '没有任何对话引用（可安全删除）',
        'group.derived': '派生缓存（可重建）',
        'group.derived.hint': '来自 attachments/request-images 与 cache/attachments，删除后会在下次显示时按需重新生成。',
        'group.meta': '{count} 项 · {size}',
        'group.select': '全选本组',
        'group.unselect': '取消本组',
        'group.select.hint': '选中或取消这个对话里的全部文件',
        'group.selected': '本组已选 {count}',
        'row.shared': '共享 ×{refs}',
        'row.missing': '已缺失',
        'row.orphan': '无引用',
        'row.derived': '派生',
        'detail.title': '选中的缓存',
        'detail.empty.title': '这个目录是什么？',
        'detail.empty.body': '这里是 Harness 的附件仓库：你粘贴的图片、上传的文件都会按内容哈希各存一份，同一份内容只占一次空间。它是持久存储，不是临时缓存：dsh 退出、重启都不会自动删除，只会随着使用不断变大。',
        'detail.empty.cache': '另外 cache/attachments 下是请求图片的派生版本（缩放/转码），可以随时重建。',
        'detail.empty.safe': '这里的删除只影响磁盘上的附件内容，不会删除对话的文字记录；但已经删掉的图片/文件无法恢复，除非重新上传。',
        'detail.session': '所属对话',
        'detail.kind': '类型',
        'detail.ext': '后缀',
        'detail.size': '大小',
        'detail.refs': '引用次数',
        'detail.aliases': '别名文件',
        'detail.mtime': '保存时间',
        'detail.digest': '内容摘要',
        'detail.preview': '预览',
        'detail.preview.missing': '磁盘上已无此内容',
        'detail.impact': '删除后有什么影响',
        'detail.delete': '删除此文件',
        'impact.dangling': '对话里仍有这条引用记录，但磁盘上的内容已经不存在，删除不会有任何额外影响。',
        'impact.orphan': '当前没有任何对话引用这份内容，删除只释放磁盘空间，不会影响任何历史对话或工具读取。',
        'impact.image.1': '这份图片被 {refs} 处引用（内容相同只存一份）。',
        'impact.image.2': '删除后，引用它的对话里历史消息中的图片将无法再显示，也无法被再次读取。',
        'impact.image.3': '对话的文字记录、推理与工具结果都保留；之后在同一对话里重新粘贴同一张图片会重新写入一份。',
        'impact.file.1': '这份文件被 {refs} 处引用（内容相同只存一份）。',
        'impact.file.2': '删除后，引用它的对话里再次打开或下载该附件会失败（附件不存在），工具也就无法再读取它的内容。',
        'impact.file.3': '文字记录与之前的分析结论保留；如果还要继续处理同一份文件，需要重新上传。',
        'impact.shared': '注意：多个对话共用这一份内容，删除会对所有引用它的对话同时生效。',
        'impact.history': '此操作不可撤销：附件不进入回收站，也无法从对话记录里重新生成。',
        'confirm.title': '确认删除 {count} 项缓存？',
        'confirm.size': '将释放约 {size}。',
        'confirm.note': '删除后这些图片/文件在历史对话中无法再显示或读取，文字记录不受影响。此操作不可撤销。',
        'confirm.ok': '删除',
        'confirm.cancel': '取消',
        'confirm.more': '…等 {count} 项',
        'status.loading': '正在读取附件仓库…',
        'status.error': '读取失败',
        'status.retry': '重试',
        'status.empty': '这里还没有任何附件缓存。',
        'status.noMatch': '没有匹配的缓存。',
        'toast.deleted': '已删除，释放 {size}。',
        'toast.failed': '有 {count} 个文件删除失败。',
        'toast.derived': '已清理派生缓存，释放 {size}。',
        'toast.error': '操作失败：{message}',
        'toast.reload': '已刷新。',
        'path.attachments': '附件仓库',
        'path.cache': '派生缓存',
        'warnings': '警告',
        'derived.action': '清理',
        'hint': '同一份内容在多个对话中只存一次；统计里的“磁盘占用”已扣除硬链接重复计数。'
      },
      en: {
        'meta.title': 'Attachment cache manager',
        'meta.description': 'Browse, preview and prune the images and files stored per conversation under attachments',
        panel: 'Attachments',
        title: 'Attachment cache',
        'toolbar.tabs.all': 'All',
        'toolbar.tabs.image': 'Images',
        'toolbar.tabs.doc': 'Documents',
        'toolbar.tabs.other': 'Other',
        'toolbar.tabs.orphan': 'Orphans',
        'toolbar.search': 'Search name, extension or digest',
        'toolbar.ext': 'Extensions',
        'toolbar.ext.placeholder': 'e.g. pdf,docx',
        'toolbar.selectAll': 'Select all shown',
        'toolbar.selectAll.hint': 'Selects every file in the current filter, including collapsed conversations',
        'toolbar.expandAll': 'Expand all',
        'toolbar.collapseAll': 'Collapse all',
        'toolbar.clearSelection': 'Clear',
        'toolbar.delete': 'Delete selected',
        'toolbar.refresh': 'Rescan',
        'storage.action': 'Location',
        'storage.title': 'Attachment storage location',
        'storage.current': 'Current directory',
        'storage.linked': 'Junction points at',
        'storage.notLinked': 'Data lives in the current directory; no junction in use',
        'storage.target': 'New location',
        'storage.target.placeholder': 'e.g. D:\\dsh-attachments',
        'storage.mode.move': 'Move and release the old directory',
        'storage.mode.move.hint': 'Copy → verify → delete the original, keeping a single copy on disk.',
        'storage.mode.keep': 'Copy and keep the old directory',
        'storage.mode.keep.hint': 'The original is renamed to v1.backup-… so you can delete it later.',
        'storage.mode.switch': 'Switch only, no copy',
        'storage.mode.switch.hint': 'The target must already hold the store; otherwise past conversations lose their images and files.',
        'storage.warn': 'Switching uses an NTFS directory junction: dsh keeps reading and writing the original path, past conversations keep working, and no restart is needed. The trade-off is that the attachments become unreadable whenever the target disk is unavailable (unplugged, drive letter changed, not mounted).',
        'storage.start': 'Start',
        'storage.cancel': 'Cancel',
        'storage.close': 'Close',
        'storage.running': 'Working…',
        'storage.phase.preparing': 'Preparing',
        'storage.phase.copying': 'Copying',
        'storage.phase.verifying': 'Verifying',
        'storage.phase.swapping': 'Switching',
        'storage.phase.cleaning': 'Cleaning up',
        'storage.phase.done': 'Done',
        'storage.phase.failed': 'Failed',
        'storage.progress': '{phase} · {files}/{total} files · {done}/{size}',
        'storage.done': 'Now stored at {target}.',
        'storage.undo': 'Restore default location',
        'storage.undo.hint': 'Copy the attachments back to ~/.dsh/attachments/v1, then remove the junction.',
        'storage.undo.clean': 'Delete the copy in the target after restoring',
        'storage.undo.done': 'Restored to the default location.',
        'storage.afterKeep': 'Backup directory: {path}',
        'storage.err.invalid-target': 'Enter an absolute path, for example D:\\dsh-attachments',
        'storage.err.inside-target': 'The target cannot be the current directory, a child of it, or a parent of it',
        'storage.err.already-linked': 'Already linked; restore first',
        'storage.err.no-space': 'Not enough free space on the target disk',
        'storage.err.verify-failed': 'Copy verification failed; nothing was changed',
        'storage.err.link-failed': 'Could not create the directory junction',
        'storage.err.not-linked': 'Not currently linked',
        'storage.err.busy': 'Another task is running',
        'storage.err.no-store': 'There is no attachment store yet',
        'storage.err.failed': 'Operation failed',
        'toolbar.clearDerived': 'Clear derived cache',
        'toolbar.scanning': 'Scanning…',
        'toolbar.clearing': 'Clearing…',
        'toolbar.deleting': 'Deleting…',
        'stat.stored': 'On disk',
        'stat.images': 'Images',
        'stat.files': 'Files',
        'stat.orphans': 'Orphans',
        'stat.derived': 'Derived',
        'stat.sessions': 'Conversations',
        'stat.dangling': 'Missing refs',
        'stat.stored.hint': 'Images + files + derived, hardlinks deduped',
        'stat.files.count': '{count} files',
        'stat.orphans.hint': 'Referenced by no conversation',
        'stat.derived.hint': '{count} regenerable files',
        'stat.sessions.hint': '{count} references',
        'stat.dangling.hint': 'Referenced by a conversation but missing on disk',
        'mix.title': 'Composition',
        'storage.change': 'Change location',
        'storage.badge.default': 'Default',
        'storage.badge.custom': 'Custom',
        'head.scanned': 'Scanned {time}',
        'group.orphans': 'Referenced by no conversation (safe to delete)',
        'group.derived': 'Derived cache (rebuildable)',
        'group.derived.hint': 'Produced under attachments/request-images and cache/attachments; regenerated on demand after deletion.',
        'group.meta': '{count} items · {size}',
        'group.select': 'Select group',
        'group.unselect': 'Unselect group',
        'group.select.hint': 'Select or clear every file in this conversation',
        'group.selected': '{count} selected',
        'row.shared': 'shared ×{refs}',
        'row.missing': 'missing',
        'row.orphan': 'orphan',
        'row.derived': 'derived',
        'detail.title': 'Selected entry',
        'detail.empty.title': 'What is this directory?',
        'detail.empty.body': 'This is the Harness attachment store: every pasted image and uploaded file is kept once under its content hash, so identical content occupies space once. It is durable storage, not a temporary cache — quitting or restarting dsh never removes it, and it only grows.',
        'detail.empty.cache': 'cache/attachments holds derived request images (resize/transcode) that can always be rebuilt.',
        'detail.empty.safe': 'Deleting here only touches attachment payloads; conversation text stays. Deleted images and files cannot be restored unless uploaded again.',
        'detail.session': 'Conversation',
        'detail.kind': 'Kind',
        'detail.ext': 'Extension',
        'detail.size': 'Size',
        'detail.refs': 'References',
        'detail.aliases': 'Alias files',
        'detail.mtime': 'Stored at',
        'detail.digest': 'Digest',
        'detail.preview': 'Preview',
        'detail.preview.missing': 'Payload no longer on disk',
        'detail.impact': 'Impact of deleting',
        'detail.delete': 'Delete this entry',
        'impact.dangling': 'The conversation still records a reference, but the payload is already gone; deleting changes nothing else.',
        'impact.orphan': 'No conversation references this payload, so deleting it only frees disk space.',
        'impact.image.1': 'This image is referenced {refs} time(s).',
        'impact.image.2': 'After deletion the image can no longer be rendered or read in the conversations that reference it.',
        'impact.image.3': 'Text, reasoning and tool results stay; pasting the same image again writes a fresh copy.',
        'impact.file.1': 'This file is referenced {refs} time(s).',
        'impact.file.2': 'After deletion, reopening or downloading it from those conversations fails, and tools can no longer read it.',
        'impact.file.3': 'Transcripts and earlier conclusions stay; upload the file again to keep working on it.',
        'impact.shared': 'Note: several conversations share this payload, so deleting affects all of them.',
        'impact.history': 'This cannot be undone: attachments have no recycle bin and cannot be reconstructed from the transcript.',
        'confirm.title': 'Delete {count} cached entries?',
        'confirm.size': 'About {size} will be freed.',
        'confirm.note': 'Those images and files can no longer be displayed or read in past conversations. Transcripts stay. This cannot be undone.',
        'confirm.ok': 'Delete',
        'confirm.cancel': 'Cancel',
        'confirm.more': '…and {count} more',
        'status.loading': 'Reading the attachment store…',
        'status.error': 'Load failed',
        'status.retry': 'Retry',
        'status.empty': 'No cached attachments yet.',
        'status.noMatch': 'Nothing matches the filters.',
        'toast.deleted': 'Deleted, {size} freed.',
        'toast.failed': '{count} file(s) could not be deleted.',
        'toast.derived': 'Derived cache cleared, {size} freed.',
        'toast.error': 'Failed: {message}',
        'toast.reload': 'Rescanned.',
        'path.attachments': 'Attachment store',
        'path.cache': 'Derived cache',
        warnings: 'Warnings',
        'derived.action': 'Clear',
        hint: 'Identical content is stored once across conversations; the on-disk figure already excludes hard-link duplicates.'
      }
    };

    const CSS_ID = '@local/attachment-cache-manager/styles.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_ID) + ']') === null) {
      const style = document.createElement('style');
      style.dataset.plugin = '@local/attachment-cache-manager';
      style.dataset.pluginCss = CSS_ID;
      style.textContent = [
        '.acm-page{--acm-blue:#2563eb;--acm-violet:#6d28d9;--acm-teal:#0f766e;--acm-green:#15803d;--acm-amber:#b45309;--acm-rose:#be123c;--acm-indigo:#4338ca;--acm-slate:#475569;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}',
        '.acm-head{display:flex;flex-direction:column;gap:14px;padding:20px 24px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}',
        '.acm-titlerow{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
        '.acm-title{margin:0;font-size:17px;font-weight:600;line-height:26px}',
        '.acm-sub{color:var(--dsw-alias-label-secondary);font-size:12px;flex:1 1 auto;min-width:0}',
        '.acm-stamp{flex:none;color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums}',
        '.acm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:10px}',
        '.acm-stat{display:flex;flex-direction:column;gap:3px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:13px;background:var(--dsw-alias-bg-layer-1);min-width:0;border-left:3px solid var(--dsw-alias-border-l2)}',
        '.acm-stat:hover{box-shadow:0 1px 3px rgba(15,23,42,.10)}',
        '.acm-stat .k{display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}',
        '.acm-stat .v{font-size:20px;line-height:26px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em}',
        '.acm-stat .s{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.acm-stat .dot{width:7px;height:7px;border-radius:999px;flex:none;background:var(--dsw-alias-state-idle-primary)}',
        '.acm-stat.warn{border-color:var(--acm-amber)}',
        '.acm-stat.warn .v,.acm-stat.warn .k{color:var(--acm-amber)}',
        '.acm-stat.warn .dot{background:var(--acm-amber)}',
        '.acm-stat[data-accent="blue"] .dot{background:var(--acm-blue)}',
        '.acm-stat[data-accent="violet"] .dot{background:var(--acm-violet)}',
        '.acm-stat[data-accent="teal"] .dot{background:var(--acm-teal)}',
        '.acm-stat[data-accent="green"] .dot{background:var(--acm-green)}',
        '.acm-stat[data-accent="amber"] .dot{background:var(--acm-amber)}',
        '.acm-stat[data-accent="blue"]{background:#2563eb0f;border-color:#2563eb33;border-left-color:var(--acm-blue)}',
        '.acm-stat[data-accent="violet"]{background:#6d28d90f;border-color:#6d28d933;border-left-color:var(--acm-violet)}',
        '.acm-stat[data-accent="teal"]{background:#0f766e0f;border-color:#0f766e33;border-left-color:var(--acm-teal)}',
        '.acm-stat[data-accent="green"]{background:#15803d0f;border-color:#15803d33;border-left-color:var(--acm-green)}',
        '.acm-stat[data-accent="amber"]{background:#b453090f;border-color:#b4530933;border-left-color:var(--acm-amber)}',
        '.acm-stat[data-accent="rose"]{background:#be123c0f;border-color:#be123c33;border-left-color:var(--acm-rose)}',
        '.acm-stat[data-accent="blue"] .v{color:color-mix(in srgb, var(--acm-blue) 74%, var(--dsw-alias-label-primary))}',
        '.acm-stat[data-accent="violet"] .v{color:color-mix(in srgb, var(--acm-violet) 74%, var(--dsw-alias-label-primary))}',
        '.acm-stat[data-accent="teal"] .v{color:color-mix(in srgb, var(--acm-teal) 74%, var(--dsw-alias-label-primary))}',
        '.acm-stat[data-accent="green"] .v{color:color-mix(in srgb, var(--acm-green) 74%, var(--dsw-alias-label-primary))}',
        '.acm-stat[data-accent="amber"] .v{color:color-mix(in srgb, var(--acm-amber) 74%, var(--dsw-alias-label-primary))}',
        '.acm-stat[data-accent="rose"] .v{color:color-mix(in srgb, var(--acm-rose) 74%, var(--dsw-alias-label-primary))}',
        '.acm-stat[data-accent]{background-clip:padding-box}',
        '.acm-stat[data-accent]:hover{box-shadow:0 0 0 1px var(--dsw-alias-border-l2) inset}',
        '.acm-mix{display:flex;flex-direction:column;gap:7px}',
        '.acm-mixbar{display:flex;height:10px;border-radius:999px;overflow:hidden;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
        '.acm-mixbar i{display:block;height:100%;transition:width .25s ease}',
        '.acm-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:11px;color:var(--dsw-alias-label-secondary)}',
        '.acm-legend span{display:inline-flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}',
        '.acm-legend i{width:8px;height:8px;border-radius:2px;flex:none}',
        '.acm-storage{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:13px;background:var(--dsw-alias-bg-layer-2)}',
        '.acm-storage .glyph{flex:none;display:inline-flex;color:var(--acm-blue)}',
        '.acm-storage .body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}',
        '.acm-storage .label{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--dsw-alias-label-secondary)}',
        '.acm-storage .value{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:18px;word-break:break-all}',
        '.acm-badge{font-size:10px;line-height:16px;padding:0 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
        '.acm-badge.linked{color:var(--acm-blue);border-color:var(--acm-blue)}',
        '.acm-paths{display:flex;flex-direction:column;gap:3px}',
        '.acm-path{display:flex;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}',
        '.acm-path span:first-child{flex:none;font-family:inherit;color:var(--dsw-alias-state-idle-primary)}',
        '.acm-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 24px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}',
        '.acm-tabs{display:inline-flex;padding:3px;gap:3px;border-radius:11px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1)}',
        '.acm-tab{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;padding:6px 13px;border-radius:8px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}',
        '.acm-tab:hover{color:var(--dsw-alias-label-primary)}',
        '.acm-tab[aria-pressed="true"]{background:var(--acm-indigo);color:#fff;font-weight:600;box-shadow:none}',
        '.acm-tabcount{font-size:10px;line-height:15px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,currentColor 22%,transparent);color:inherit;font-variant-numeric:tabular-nums;opacity:.95}',
        '.acm-input{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;padding:0 10px;height:34px;border-radius:10px;min-width:120px}',
        '.acm-input::placeholder{color:var(--dsw-alias-label-secondary)}',
        '.acm-input:focus-visible{outline:2px solid var(--acm-blue);outline-offset:1px}',
        '.acm-input.search{flex:1 1 240px;max-width:380px;min-width:180px}',
        '.acm-input.ext{width:150px;flex:none}',
        '.acm-spacer{flex:1 1 auto}',
        '.acm-button{appearance:none;font:inherit;font-size:12.5px;line-height:18px;padding:0 12px;height:34px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}',
        '.acm-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}',
        '.acm-button:disabled{opacity:.55;cursor:default}',
        '.acm-button.ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}',
        '.acm-button.ghost:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1)}',
        '.acm-button.solid{font-weight:500;color:#fff;border-color:transparent}',
        '.acm-button.solid:hover:not(:disabled){border-color:transparent;filter:brightness(1.08)}',
        '.acm-button.solid:disabled{filter:saturate(.45)}',
        '.acm-button.blue{background:var(--acm-blue)}',
        '.acm-button.violet{background:var(--acm-violet)}',
        '.acm-button.teal{background:var(--acm-teal)}',
        '.acm-button.green{background:var(--acm-green)}',
        '.acm-button.rose{background:var(--acm-rose)}',
        '.acm-button.amber{background:var(--acm-amber)}',
        '.acm-button.tint{border-color:transparent;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
        '.acm-button.danger{border-color:var(--acm-rose);color:var(--acm-rose)}',
        '.acm-button.danger.solid{background:var(--acm-rose);color:#fff;border-color:transparent}',
        '.acm-button.danger.solid:hover:not(:disabled){filter:brightness(1.08)}',
        '.acm-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 340px}',
        '.acm-list{min-height:0;overflow:auto;padding:16px 24px 40px}',
        '.acm-aside{min-height:0;overflow:auto;padding:18px 20px;border-left:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
        '.acm-group{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;margin-bottom:10px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;transition:border-color .15s ease}',
        '.acm-group:hover{border-color:var(--dsw-alias-border-l2)}',
        '.acm-group[data-open="true"]{border-color:var(--dsw-alias-border-l2)}',
        '.acm-group[data-orphan="true"]{border-color:#b4530933}',
        '.acm-group[data-orphan="true"] .acm-grouplead{background:#b453091f;color:var(--acm-amber)}',
        '.acm-grouphead{display:flex;align-items:center;gap:11px;padding:12px 14px;cursor:pointer;user-select:none}',
        '.acm-grouphead:hover{background:var(--dsw-alias-bg-layer-2)}',
        '.acm-grouplead{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
        '.acm-group[data-open="true"] .acm-grouplead{background:#2563eb1f;color:var(--acm-blue)}',
        '.acm-chevron{flex:none;color:inherit;transition:transform .15s ease}',
        '.acm-groupbody{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}',
        '.acm-groupname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px;font-weight:600;line-height:19px}',
        '.acm-groupmeta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums}',
        '.acm-grouptag{flex:none;font-size:10px;line-height:15px;padding:0 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
        '.acm-grouptag.hit{color:var(--acm-violet);border-color:var(--acm-violet)}',
        '.acm-groupselect{appearance:none;flex:none;height:26px;padding:0 10px;border-radius:8px;border:1px solid #6d28d959;background:#6d28d914;color:var(--acm-violet);font:inherit;font-size:11px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
        '.acm-groupselect:hover{background:#6d28d929}',
        '.acm-groupselect[data-on="true"]{background:var(--acm-violet);border-color:transparent;color:#fff}',
        '.acm-rows{list-style:none;margin:0;padding:0 6px 6px;display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--dsw-alias-border-l1)}',
        '.acm-row{display:flex;align-items:center;gap:9px;padding:5px 8px;border-radius:9px}',
        '.acm-row:hover{background:var(--dsw-alias-bg-layer-2)}',
        '.acm-row[data-focus="true"]{box-shadow:0 0 0 1px var(--acm-blue) inset}',
        '.acm-row[data-selected="true"]{background:var(--dsw-alias-bg-layer-2)}',
        '.acm-check{flex:none;display:inline-flex;align-items:center}',
        '.acm-check input{width:14px;height:14px;accent-color:var(--acm-blue);cursor:pointer;margin:0}',
        '.acm-main{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px;background:transparent;border:0;padding:2px 0;font:inherit;color:inherit;text-align:left;cursor:pointer}',
        '.acm-main:focus-visible{outline:2px solid var(--acm-blue);outline-offset:2px;border-radius:6px}',
        '.acm-glyph{flex:none;display:inline-flex;color:var(--dsw-alias-label-secondary)}',
        '.acm-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.acm-tag{flex:none;font-size:10px;padding:1px 6px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
        '.acm-tag.shared{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}',
        '.acm-tag.missing{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
        '.acm-size{flex:none;color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums;min-width:62px;text-align:right}',
        '.acm-rowdelete{flex:none;opacity:0;color:var(--dsw-alias-label-secondary)}',
        '.acm-row:hover .acm-rowdelete,.acm-rowdelete:focus-visible{opacity:1}',
        '.acm-rowdelete{appearance:none;border:0;background:transparent;cursor:pointer;border-radius:6px;padding:2px;display:inline-flex;color:var(--dsw-alias-state-error-primary)}',
        '.acm-status{padding:24px 4px;color:var(--dsw-alias-label-secondary);display:flex;flex-direction:column;gap:10px;align-items:flex-start}',
        '.acm-status.error{color:var(--dsw-alias-state-error-primary)}',
        '.acm-detail{display:flex;flex-direction:column;gap:12px}',
        '.acm-detail h2{margin:0;font-size:13px;font-weight:600;line-height:20px}',
        '.acm-detail h3{margin:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
        '.acm-detail p{margin:0;color:var(--dsw-alias-label-secondary)}',
        '.acm-detail ul{margin:0;padding-left:16px;color:var(--dsw-alias-label-secondary);display:flex;flex-direction:column;gap:4px}',
        '.acm-thumb{max-width:100%;max-height:190px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);object-fit:contain;background:var(--dsw-alias-bg-base)}',
        '.acm-kv{display:grid;grid-template-columns:78px minmax(0,1fr);gap:4px 10px;font-size:12px}',
        '.acm-kv dt{color:var(--dsw-alias-label-secondary)}',
        '.acm-kv dd{margin:0;word-break:break-word;font-variant-numeric:tabular-nums}',
        '.acm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;word-break:break-all}',
        '.acm-divider{height:1px;background:var(--dsw-alias-border-l1)}',
        '.acm-toast{position:sticky;bottom:0;margin:0 24px 14px;padding:7px 12px;border-radius:10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font-size:12px}',
        '.acm-overlay{position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.42);display:flex;align-items:center;justify-content:center;padding:24px}',
        '.acm-modal{width:min(520px,100%);max-height:80vh;overflow:auto;border-radius:16px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 18px 48px rgba(15,23,42,.28)}',
        '.acm-modal h2{margin:0;font-size:14px}',
        '.acm-modal ul{margin:0;padding-left:18px;color:var(--dsw-alias-label-secondary);font-size:12px;display:flex;flex-direction:column;gap:4px}',
        '.acm-modalfoot{display:flex;justify-content:flex-end;gap:8px}',
        '.acm-modal.wide{width:min(620px,100%)}',
        '.acm-modal h2{display:flex;align-items:center;gap:8px}',
        '.acm-input.path{width:100%;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
        '.acm-radio{display:flex;gap:8px;align-items:flex-start;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;cursor:pointer;background:var(--dsw-alias-bg-layer-1)}',
        '.acm-radio[data-active="true"]{border-color:var(--acm-blue)}',
        '.acm-radio input{margin:2px 0 0;accent-color:var(--acm-blue);flex:none}',
        '.acm-radio span{display:flex;flex-direction:column;gap:2px;font-size:12px;min-width:0}',
        '.acm-radio small{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}',
        '.acm-warn{font-size:11px;line-height:17px;color:var(--dsw-alias-state-warn-primary);border:1px solid var(--dsw-alias-state-warn-primary);border-radius:10px;padding:8px 10px}',
        '.acm-progress{display:flex;flex-direction:column;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}',
        '.acm-bar{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);overflow:hidden}',
        '.acm-bar i{display:block;height:100%;background:var(--acm-blue);transition:width .2s ease}',
        '.acm-checkline{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
        '.acm-checkline input{margin:0;accent-color:var(--acm-blue)}'
      ].join('\n');
      document.head.appendChild(style);
    }

    function fallbackT(key, params) {
      const dict = DICT.zh;
      const template = dict[key] ?? key;
      if (params === undefined) return template;
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    }

    function formatBytes(value) {
      const bytes = typeof value === 'number' && Number.isFinite(value) ? value : 0;
      if (bytes < 1024) return `${bytes} B`;
      const units = ['KB', 'MB', 'GB', 'TB'];
      let size = bytes / 1024;
      let index = 0;
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
      }
      return `${size >= 100 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
    }

    function formatTime(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '—';
      const pad = (part) => String(part).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function IconPanel({ size }) {
      const px = size ?? 18;
      return h('svg', { width: px, height: px, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M2 3.2h12v2.4H2z', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round' }),
        h('path', { d: 'M3 5.6h10v7.2H3z', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round' }),
        h('path', { d: 'M6.4 8.2h3.2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }),
        h('path', { d: 'M6.4 10.4h2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' })
      );
    }

    function IconChevron({ open }) {
      return h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', className: 'acm-chevron', style: { transform: open ? 'rotate(90deg)' : 'none' }, 'aria-hidden': 'true' },
        h('path', { d: 'M4.5 2.5 8 6l-3.5 3.5', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' })
      );
    }

    function IconForItem({ item }) {
      if (item.kind === 'image') {
        return h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
          h('rect', { x: 2, y: 2.8, width: 12, height: 10.4, rx: 2, stroke: 'currentColor', strokeWidth: 1.3 }),
          h('circle', { cx: 6, cy: 6.4, r: 1.1, fill: 'currentColor' }),
          h('path', { d: 'M3 11.4l3.1-3 2.2 2.1 2-1.7 2.6 2.6', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
        );
      }
      return h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4 1.8h5l3 3v9.4H4z', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round' }),
        h('path', { d: 'M9 1.8v3h3', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round' })
      );
    }

    function IconTrash({ size }) {
      const px = size ?? 13;
      return h('svg', { width: px, height: px, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M3 4.4h10M6.4 4.4V3h3.2v1.4M4.6 4.4l.5 8.4h5.8l.5-8.4', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
      );
    }

    function IconDrive({ size }) {
      const px = size ?? 16;
      return h('svg', { width: px, height: px, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('rect', { x: 1.8, y: 3.2, width: 12.4, height: 4, rx: 1.4, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('rect', { x: 1.8, y: 8.8, width: 12.4, height: 4, rx: 1.4, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('path', { d: 'M4.4 5.2h.01M4.4 10.8h.01', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' })
      );
    }

    function impactLines(item, t) {
      if (item === undefined) return [];
      if (!item.stored) return [t('impact.dangling')];
      if (item.orphan) return [t('impact.orphan')];
      const lines = item.kind === 'image'
        ? [t('impact.image.1', { refs: item.refs }), t('impact.image.2'), t('impact.image.3')]
        : [t('impact.file.1', { refs: item.refs }), t('impact.file.2'), t('impact.file.3')];
      if (item.refs > 1) lines.push(t('impact.shared'));
      lines.push(t('impact.history'));
      return lines;
    }

    function matches(item, tab, tokens, query) {
      if (tab === 'orphan') {
        if (item.orphan !== true) return false;
      } else {
        if (item.orphan === true && tab !== 'all') return false;
        if (tab === 'image' && item.kind !== 'image') return false;
        if (tab === 'doc' && item.bucket !== 'doc') return false;
        if (tab === 'other' && (item.kind === 'image' || item.bucket === 'doc')) return false;
      }
      if (tokens.length > 0 && !tokens.includes(item.ext)) return false;
      if (query !== '') {
        const haystack = `${item.name}\n${item.digest}\n${item.mediaType ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    }

    function Panel(props) {
      const t = typeof props.t === 'function' ? props.t : fallbackT;
      const [state, setState] = useState(null);
      const [status, setStatus] = useState('loading');
      const [error, setError] = useState('');
      const [tab, setTab] = useState('all');
      const [query, setQuery] = useState('');
      const [ext, setExt] = useState('');
      const [selected, setSelected] = useState(() => new Set());
      const [focusDigest, setFocusDigest] = useState(null);
      const [expanded, setExpanded] = useState(() => new Set());
      const [confirm, setConfirm] = useState(null);
      const [busy, setBusy] = useState(null);
      const [toast, setToast] = useState(null);
      const [storageOpen, setStorageOpen] = useState(false);
      const [storageTarget, setStorageTarget] = useState('');
      const [storageMode, setStorageMode] = useState('move');
      const [storageJob, setStorageJob] = useState(null);
      const [storageUndoClean, setStorageUndoClean] = useState(true);

      const load = useCallback(async (announce) => {
        setStatus('loading');
        setError('');
        try {
          const response = await fetch(`${API}/state`);
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error ?? response.statusText);
          setState(payload);
          setStatus('ready');
          if (announce === true) setToast({ text: t('toast.reload') });
        } catch (cause) {
          setStatus('error');
          setError(String(cause?.message ?? cause));
        }
      }, [t]);

      useEffect(() => {
        void load(false);
      }, [load]);

      useEffect(() => {
        if (toast === null) return undefined;
        const timer = window.setTimeout(() => setToast(null), 4200);
        return () => window.clearTimeout(timer);
      }, [toast]);

      const itemIndex = useMemo(() => {
        const map = new Map();
        if (state !== null) {
          for (const session of state.sessions) for (const item of session.items) if (!map.has(item.digest)) map.set(item.digest, item);
          for (const item of state.orphans) if (!map.has(item.digest)) map.set(item.digest, item);
        }
        return map;
      }, [state]);

      const extTokens = useMemo(() => ext
        .split(/[,，\s]+/)
        .map((token) => token.trim().toLowerCase().replace(/^\./, ''))
        .filter((token) => token !== ''), [ext]);

      const normalizedQuery = query.trim().toLowerCase();

      const groups = useMemo(() => {
        if (state === null) return [];
        const result = [];
        const orphans = state.orphans.filter((item) => matches(item, 'orphan' === tab ? 'orphan' : tab, extTokens, normalizedQuery));
        if (orphans.length > 0 && (tab === 'all' || tab === 'orphan')) {
          result.push({ id: '__orphans__', title: t('group.orphans'), items: orphans, orphanGroup: true });
        }
        if (tab !== 'orphan') {
          for (const session of state.sessions) {
            const items = session.items.filter((item) => matches(item, tab, extTokens, normalizedQuery));
            if (items.length === 0) continue;
            result.push({
              id: session.id,
              title: session.title,
              createdAt: session.createdAt,
              isSubagent: session.isSubagent,
              items
            });
          }
        }
        return result;
      }, [state, tab, extTokens, normalizedQuery, t]);

      const visibleItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

      const selectedBytes = useMemo(() => {
        let total = 0;
        for (const digest of selected) {
          const item = itemIndex.get(digest);
          if (item !== undefined) total += item.bytes ?? 0;
        }
        return total;
      }, [selected, itemIndex]);

      const focusItem = focusDigest === null ? undefined : itemIndex.get(focusDigest);
      const focusSession = useMemo(() => {
        if (state === null || focusDigest === null) return undefined;
        for (const session of state.sessions) {
          if (session.items.some((item) => item.digest === focusDigest)) return session;
        }
        return undefined;
      }, [state, focusDigest]);

      const toggleSelect = useCallback((digest) => {
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(digest)) next.delete(digest);
          else next.add(digest);
          return next;
        });
      }, []);

      const selectGroup = useCallback((items) => {
        setSelected((current) => {
          const next = new Set(current);
          const allSelected = items.every((item) => next.has(item.digest));
          for (const item of items) {
            if (allSelected) next.delete(item.digest);
            else next.add(item.digest);
          }
          return next;
        });
      }, []);

      const toggleCollapse = useCallback((id) => {
        setExpanded((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }, []);

      const toggleAllGroups = useCallback((ids, open) => {
        setExpanded((current) => {
          const next = new Set(current);
          for (const id of ids) {
            if (open) next.add(id);
            else next.delete(id);
          }
          return next;
        });
      }, []);

      const postJson = useCallback(async (path, body) => {
        const response = await fetch(`${API}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body ?? {})
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const failure = new Error(payload?.error ?? response.statusText);
          failure.code = payload?.error;
          failure.detail = payload?.message;
          throw failure;
        }
        return payload;
      }, []);

      const storageErrorText = useCallback((code, detail) => {
        const key = `storage.err.${code}`;
        const text = t(key);
        if (text !== key) return text;
        return typeof detail === 'string' && detail !== '' ? detail : t('storage.err.failed');
      }, [t]);

      const refreshStorage = useCallback(async () => {
        try {
          const response = await fetch(`${API}/state`);
          const payload = await response.json();
          if (response.ok) setState(payload);
        } catch {
          /* the poll already reports failures through the job */
        }
      }, []);

      const beginStorage = useCallback(async (path, body) => {
        setBusy('storage');
        setStorageJob(null);
        try {
          const payload = await postJson(path, body);
          setStorageJob(payload.job ?? null);
        } catch (cause) {
          setBusy(null);
          setToast({ text: storageErrorText(cause?.code, cause?.detail ?? cause?.message) });
        }
      }, [postJson, storageErrorText]);

      useEffect(() => {
        if (storageJob === null || storageJob.done === true) return undefined;
        let cancelled = false;
        const timer = window.setInterval(() => {
          void (async () => {
            try {
              const response = await fetch(`${API}/relocate`);
              const payload = await response.json();
              if (cancelled) return;
              const job = payload?.job ?? null;
              if (job === null) return;
              setStorageJob(job);
              if (job.done !== true) return;
              window.clearInterval(timer);
              setBusy(null);
              if (job.error !== null && job.error !== undefined) {
                setToast({ text: storageErrorText(job.errorCode, job.error) });
              } else if (job.kind === 'undo') {
                setToast({ text: t('storage.undo.done') });
              } else {
                const target = job.result?.target ?? job.target;
                setStorageTarget(target);
                setToast({ text: t('storage.done', { target }) });
              }
              await refreshStorage();
            } catch {
              /* transient; the next tick retries */
            }
          })();
        }, 900);
        return () => {
          cancelled = true;
          window.clearInterval(timer);
        };
      }, [storageJob, refreshStorage, storageErrorText, t]);

      const runDelete = useCallback(async (digests) => {
        if (digests.length === 0) return;
        setBusy('delete');
        setConfirm(null);
        try {
          const payload = await postJson('/delete', { digests });
          setState(payload.state);
          setSelected(new Set());
          setFocusDigest(null);
          const freed = formatBytes(payload.result?.freedBytes ?? 0);
          const failed = payload.result?.failed?.length ?? 0;
          setToast({ text: t('toast.deleted', { size: freed }) + (failed > 0 ? ` ${t('toast.failed', { count: failed })}` : '') });
        } catch (cause) {
          setToast({ text: t('toast.error', { message: String(cause?.message ?? cause) }) });
        } finally {
          setBusy(null);
        }
      }, [postJson, t]);

      const runClearDerived = useCallback(async () => {
        setBusy('derived');
        try {
          const payload = await postJson('/clear-derived', {});
          setState(payload.state);
          setToast({ text: t('toast.derived', { size: formatBytes(payload.result?.freedBytes ?? 0) }) });
        } catch (cause) {
          setToast({ text: t('toast.error', { message: String(cause?.message ?? cause) }) });
        } finally {
          setBusy(null);
        }
      }, [postJson, t]);

      const requestDelete = useCallback((digests) => {
        const unique = [...new Set(digests)].filter((digest) => itemIndex.has(digest));
        if (unique.length === 0) return;
        const bytes = unique.reduce((total, digest) => total + (itemIndex.get(digest)?.bytes ?? 0), 0);
        setConfirm({ digests: unique, bytes, items: unique.slice(0, 8).map((digest) => itemIndex.get(digest)) });
      }, [itemIndex]);

      const onKeyDown = (event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        if (confirm !== null) {
          event.preventDefault();
          setConfirm(null);
          return;
        }
        if (focusDigest !== null) {
          event.preventDefault();
          setFocusDigest(null);
        }
      };

      const totals = state?.totals;
      const derived = state?.derived;
      const storage = state?.storage;
      const linked = storage?.rootIsLink === true;

      const tabCounts = useMemo(() => {
        const counts = { all: 0, image: 0, doc: 0, other: 0, orphan: 0 };
        for (const item of itemIndex.values()) {
          counts.all += 1;
          if (item.orphan === true) counts.orphan += 1;
          if (item.kind === 'image') counts.image += 1;
          else if (item.bucket === 'doc') counts.doc += 1;
          else counts.other += 1;
        }
        return counts;
      }, [itemIndex]);

      const stats = totals === undefined ? [] : [
        { key: 'stored', label: t('stat.stored'), value: formatBytes(totals.storedBytes), sub: t('stat.stored.hint'), accent: 'blue' },
        { key: 'images', label: t('stat.images'), value: formatBytes(totals.imageBytes), sub: t('stat.files.count', { count: totals.imageCount }), accent: 'violet' },
        { key: 'files', label: t('stat.files'), value: formatBytes(totals.fileBytes), sub: t('stat.files.count', { count: totals.fileCount }), accent: 'teal' },
        { key: 'orphans', label: t('stat.orphans'), value: formatBytes(totals.orphanBytes), sub: t('stat.files.count', { count: totals.orphanCount }), accent: totals.orphanCount > 0 ? 'amber' : 'idle', warn: totals.orphanCount > 0 },
        { key: 'derived', label: t('stat.derived'), value: formatBytes(totals.derivedBytes), sub: t('stat.derived.hint', { count: totals.derivedCount }), accent: 'green' },
        { key: 'sessions', label: t('stat.sessions'), value: String(totals.sessions), sub: t('stat.sessions.hint', { count: totals.itemCount }), accent: 'idle' }
      ];
      if (totals !== undefined && totals.danglingCount > 0) {
        stats.push({
          key: 'dangling',
          label: t('stat.dangling'),
          value: String(totals.danglingCount),
          sub: t('stat.dangling.hint'),
          accent: 'warn',
          warn: true
        });
      }

      const mixBase = totals === undefined ? 1 : Math.max(1, totals.imageBytes + totals.fileBytes + totals.derivedBytes);
      const mix = totals === undefined ? [] : [
        { key: 'images', label: t('stat.images'), bytes: totals.imageBytes, color: 'var(--acm-violet)' },
        { key: 'files', label: t('stat.files'), bytes: totals.fileBytes, color: 'var(--acm-teal)' },
        { key: 'derived', label: t('stat.derived'), bytes: totals.derivedBytes, color: 'var(--acm-green)' }
      ];

      const openStorage = () => {
        setStorageTarget(storage?.rootLinkTarget ?? '');
        setStorageJob(null);
        setStorageOpen(true);
      };

      const tabDefs = [
        ['all', t('toolbar.tabs.all')],
        ['image', t('toolbar.tabs.image')],
        ['doc', t('toolbar.tabs.doc')],
        ['other', t('toolbar.tabs.other')],
        ['orphan', t('toolbar.tabs.orphan')]
      ];

      return h('section', { className: 'acm-page', 'aria-label': t('title'), onKeyDown },
        h('header', { className: 'acm-head' },
          h('div', { className: 'acm-titlerow' },
            h('h1', { className: 'acm-title' }, t('title')),
            h('span', { className: 'acm-sub' }, t('hint')),
            state === null ? null : h('span', { className: 'acm-stamp' }, t('head.scanned', { time: formatTime(state.scannedAt) }))
          ),
          stats.length === 0 ? null : h('div', { className: 'acm-stats' },
            ...stats.map((card) => h('div', {
              key: card.key,
              className: card.warn === true ? 'acm-stat warn' : 'acm-stat',
              'data-accent': card.accent
            },
              h('span', { className: 'k' }, h('i', { className: 'dot' }), card.label),
              h('span', { className: 'v' }, card.value),
              h('span', { className: 's', title: card.sub }, card.sub)
            ))
          ),
          mix.length === 0 ? null : h('div', { className: 'acm-mix' },
            h('div', { className: 'acm-mixbar', role: 'img', 'aria-label': t('mix.title') },
              ...mix.map((part) => h('i', {
                key: part.key,
                style: { width: `${Math.max(part.bytes / mixBase * 100, part.bytes > 0 ? 1.5 : 0)}%`, background: part.color }
              }))
            ),
            h('div', { className: 'acm-legend' },
              ...mix.map((part) => h('span', { key: part.key },
                h('i', { style: { background: part.color } }),
                part.label,
                ` ${formatBytes(part.bytes)}`))
            )
          ),
          state === null ? null : h('div', { className: 'acm-storage' },
            h('span', { className: 'glyph', 'aria-hidden': 'true' }, h(IconDrive, { size: 18 })),
            h('div', { className: 'body' },
              h('div', { className: 'label' },
                h('span', null, t('path.attachments')),
                h('span', { className: linked ? 'acm-badge linked' : 'acm-badge' },
                  linked ? t('storage.badge.custom') : t('storage.badge.default'))
              ),
              h('div', { className: 'value' }, state.paths.root),
              linked
                ? h('div', { className: 'value' }, `${t('storage.linked')} → ${storage.rootLinkTarget}`)
                : null
            ),
            h('button', {
              type: 'button',
              className: 'acm-button solid blue',
              disabled: busy !== null,
              title: t('storage.title'),
              onClick: openStorage
            }, h(IconDrive, { size: 15 }), t('storage.change'))
          ),
          state === null ? null : h('div', { className: 'acm-paths' },
            h('div', { className: 'acm-path' }, h('span', null, t('path.cache')), h('span', null, state.paths.cacheRoot))
          ),
          state !== null && state.warnings?.length > 0
            ? h('div', { className: 'acm-path' }, h('span', null, t('warnings')), h('span', null, state.warnings.join(' · ')))
            : null
        ),
        h('div', { className: 'acm-toolbar' },
          h('div', { className: 'acm-tabs', role: 'group' },
            ...tabDefs.map(([value, label]) => h('button', {
              key: value,
              type: 'button',
              className: 'acm-tab',
              'aria-pressed': tab === value,
              onClick: () => setTab(value)
            },
              h('span', null, label),
              tabCounts[value] > 0 ? h('span', { className: 'acm-tabcount' }, String(tabCounts[value])) : null
            ))
          ),
          h('input', {
            className: 'acm-input search',
            type: 'search',
            value: query,
            placeholder: t('toolbar.search'),
            'aria-label': t('toolbar.search'),
            onChange: (event) => setQuery(event.target.value)
          }),
          h('input', {
            className: 'acm-input ext',
            type: 'text',
            value: ext,
            placeholder: t('toolbar.ext.placeholder'),
            'aria-label': t('toolbar.ext'),
            onChange: (event) => setExt(event.target.value)
          }),
          h('button', {
            type: 'button',
            className: 'acm-button solid violet',
            disabled: visibleItems.length === 0,
            title: t('toolbar.selectAll.hint'),
            onClick: () => {
              const allSelected = visibleItems.length > 0 && visibleItems.every((item) => selected.has(item.digest));
              setSelected((current) => {
                const next = new Set(current);
                if (allSelected) {
                  for (const item of visibleItems) next.delete(item.digest);
                } else {
                  for (const item of visibleItems) next.add(item.digest);
                }
                return next;
              });
            }
          }, (visibleItems.length > 0 && visibleItems.every((item) => selected.has(item.digest)))
            ? `${t('toolbar.clearSelection')} (${visibleItems.length})`
            : `${t('toolbar.selectAll')} (${visibleItems.length})`),
          h('button', {
            type: 'button',
            className: 'acm-button solid green',
            disabled: groups.length === 0,
            onClick: () => {
              const ids = groups.map((group) => group.id);
              const allOpen = ids.length > 0 && ids.every((id) => expanded.has(id));
              toggleAllGroups(ids, !allOpen);
            }
          }, groups.length > 0 && groups.every((group) => expanded.has(group.id)) ? t('toolbar.collapseAll') : t('toolbar.expandAll')),
          h('span', { className: 'acm-spacer' }),
          h('button', {
            type: 'button',
            className: 'acm-button solid teal',
            disabled: busy !== null || status === 'loading',
            onClick: () => void load(true)
          }, busy === 'delete' ? t('toolbar.deleting') : status === 'loading' ? t('toolbar.scanning') : t('toolbar.refresh')),
          h('button', {
            type: 'button',
            className: 'acm-button solid blue',
            disabled: busy !== null,
            title: state?.paths?.root ?? t('storage.action'),
            onClick: openStorage
          }, h(IconDrive, { size: 15 }), t('storage.action')),
          h('button', {
            type: 'button',
            className: 'acm-button solid rose',
            disabled: busy !== null || selected.size === 0,
            onClick: () => requestDelete([...selected])
          }, `${t('toolbar.delete')} (${selected.size} · ${formatBytes(selectedBytes)})`)
        ),
        h('div', { className: 'acm-body' },
          h('div', { className: 'acm-list' },
            status === 'loading' && state === null
              ? h('div', { className: 'acm-status' }, t('status.loading'))
              : status === 'error'
                ? h('div', { className: 'acm-status error' },
                  h('div', null, `${t('status.error')}: ${error}`),
                  h('button', { type: 'button', className: 'acm-button', onClick: () => void load(false) }, t('status.retry')))
                : state !== null && groups.length === 0
                  ? h('div', { className: 'acm-status' }, state.sessions.length === 0 ? t('status.empty') : t('status.noMatch'))
                  : groups.map((group) => {
                    const open = expanded.has(group.id);
                    const groupBytes = group.items.reduce((total, item) => total + (item.bytes ?? 0), 0);
                    const groupSelected = group.items.filter((item) => selected.has(item.digest)).length;
                    const allGroupSelected = group.items.length > 0 && groupSelected === group.items.length;
                    return h('section', { className: 'acm-group', key: group.id, 'data-open': open ? 'true' : 'false', 'data-orphan': group.orphanGroup === true ? 'true' : 'false' },
                      h('div', {
                        className: 'acm-grouphead',
                        role: 'button',
                        tabIndex: 0,
                        'aria-expanded': open,
                        onClick: () => toggleCollapse(group.id),
                        onKeyDown: (event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return;
                          event.preventDefault();
                          toggleCollapse(group.id);
                        }
                      },
                        h('span', { className: 'acm-grouplead', 'aria-hidden': 'true' }, h(IconChevron, { open })),
                        h('div', { className: 'acm-groupbody' },
                          h('div', { className: 'acm-groupname', title: group.title ?? group.id },
                            group.title ?? `#${String(group.id).replace(/^session-/, '').slice(0, 8)}`),
                          h('div', { className: 'acm-groupmeta' },
                            h('span', null, t('group.meta', { count: group.items.length, size: formatBytes(groupBytes) })),
                            group.isSubagent === true ? h('span', { className: 'acm-grouptag' }, 'subagent') : null,
                            groupSelected > 0
                              ? h('span', { className: 'acm-grouptag hit' }, t('group.selected', { count: groupSelected }))
                              : null
                          )
                        ),
                        h('button', {
                          type: 'button',
                          className: 'acm-groupselect',
                          'data-on': allGroupSelected ? 'true' : 'false',
                          title: t('group.select.hint'),
                          onClick: (event) => {
                            event.stopPropagation();
                            selectGroup(group.items);
                          }
                        }, allGroupSelected ? t('group.unselect') : t('group.select'))
                      ),
                      open ? h('ul', { className: 'acm-rows' },
                        ...group.items.map((item) => h('li', {
                          key: `${group.id}:${item.digest}`,
                          className: 'acm-row',
                          'data-selected': selected.has(item.digest) ? 'true' : 'false',
                          'data-focus': focusDigest === item.digest ? 'true' : 'false'
                        },
                          h('label', { className: 'acm-check' },
                            h('input', {
                              type: 'checkbox',
                              checked: selected.has(item.digest),
                              'aria-label': item.name,
                              onChange: () => toggleSelect(item.digest)
                            })),
                          h('button', {
                            type: 'button',
                            className: 'acm-main',
                            title: impactLines(item, t).join(' '),
                            onClick: () => setFocusDigest(item.digest),
                            onMouseEnter: () => setFocusDigest(item.digest),
                            onFocus: () => setFocusDigest(item.digest)
                          },
                            h('span', { className: 'acm-glyph' }, h(IconForItem, { item })),
                            h('span', { className: 'acm-name' }, item.name),
                            item.ext === '' ? null : h('span', { className: 'acm-tag' }, item.ext),
                            item.refs > 1 ? h('span', { className: 'acm-tag shared' }, t('row.shared', { refs: item.refs })) : null,
                            item.orphan === true ? h('span', { className: 'acm-tag' }, t('row.orphan')) : null,
                            item.stored === false ? h('span', { className: 'acm-tag missing' }, t('row.missing')) : null
                          ),
                          h('span', { className: 'acm-size' }, formatBytes(item.bytes)),
                          h('button', {
                            type: 'button',
                            className: 'acm-rowdelete',
                            'aria-label': t('detail.delete'),
                            title: t('detail.delete'),
                            onClick: (event) => {
                              event.stopPropagation();
                              requestDelete([item.digest]);
                            }
                          }, h(IconTrash, {}))
                        ))
                      ) : null
                    );
                  })
          ),
          h('aside', { className: 'acm-aside' }, renderAside())
        ),
        toast === null ? null : h('div', { className: 'acm-toast', role: 'status' }, toast.text),
        storageOpen ? renderStorageModal() : null,
        confirm === null ? null : h('div', { className: 'acm-overlay', onClick: () => setConfirm(null) },
          h('div', {
            className: 'acm-modal',
            role: 'dialog',
            'aria-modal': 'true',
            onClick: (event) => event.stopPropagation()
          },
            h('h2', null, t('confirm.title', { count: confirm.digests.length })),
            h('div', null, t('confirm.size', { size: formatBytes(confirm.bytes) })),
            h('ul', null,
              ...confirm.items.filter(Boolean).map((item) => h('li', { key: item.digest }, `${item.name} · ${formatBytes(item.bytes)}`)),
              confirm.digests.length > confirm.items.length
                ? h('li', { key: '__more__' }, t('confirm.more', { count: confirm.digests.length - confirm.items.length }))
                : null
            ),
            h('div', { className: 'acm-detail' }, h('p', null, t('confirm.note'))),
            h('div', { className: 'acm-modalfoot' },
              h('button', { type: 'button', className: 'acm-button', onClick: () => setConfirm(null) }, t('confirm.cancel')),
              h('button', {
                type: 'button',
                className: 'acm-button danger solid',
                disabled: busy !== null,
                onClick: () => void runDelete(confirm.digests)
              }, busy === 'delete' ? t('toolbar.deleting') : t('confirm.ok'))
            )
          )
        )
      );

      function renderStorageModal() {
        const storage = state?.storage;
        const linked = storage?.rootIsLink === true;
        const job = storageJob;
        const running = job !== null && job.done !== true;
        const phaseText = job === null ? t('storage.phase.preparing') : t(`storage.phase.${job.phase}`);
        const total = job?.totalBytes ?? 0;
        const done = job?.bytes ?? 0;
        const percent = total > 0
          ? Math.min(100, Math.round((done / total) * 100))
          : job !== null && job.done === true ? 100 : 0;
        const close = () => {
          if (!running) setStorageOpen(false);
        };
        const modes = [
          ['move', t('storage.mode.move'), t('storage.mode.move.hint')],
          ['keep', t('storage.mode.keep'), t('storage.mode.keep.hint')],
          ['switch', t('storage.mode.switch'), t('storage.mode.switch.hint')]
        ];

        return h('div', { className: 'acm-overlay', onClick: close },
          h('div', {
            className: 'acm-modal wide',
            role: 'dialog',
            'aria-modal': 'true',
            onClick: (event) => event.stopPropagation()
          },
            h('h2', null, t('storage.title')),
            h('div', { className: 'acm-kv' },
              h('dt', null, t('storage.current')),
              h('dd', { className: 'acm-mono' }, storage?.root ?? state?.paths?.root ?? '—'),
              h('dt', null, t('storage.linked')),
              h('dd', { className: 'acm-mono' }, linked ? storage.rootLinkTarget : t('storage.notLinked'))
            ),
            h('div', { className: 'acm-detail' },
              h('h3', null, t('storage.target')),
              h('input', {
                className: 'acm-input path',
                type: 'text',
                value: storageTarget,
                placeholder: t('storage.target.placeholder'),
                'aria-label': t('storage.target'),
                disabled: running || linked,
                onChange: (event) => setStorageTarget(event.target.value)
              })
            ),
            linked || running ? null : h('div', { className: 'acm-detail' },
              ...modes.map(([value, label, hint]) => h('label', {
                key: value,
                className: 'acm-radio',
                'data-active': storageMode === value ? 'true' : 'false'
              },
                h('input', {
                  type: 'radio',
                  name: 'acm-storage-mode',
                  checked: storageMode === value,
                  onChange: () => setStorageMode(value)
                }),
                h('span', null, h('span', null, label), h('small', null, hint))
              ))
            ),
            h('div', { className: 'acm-warn' }, t('storage.warn')),
            linked && !running ? h('div', { className: 'acm-detail' },
              h('p', null, t('storage.undo.hint')),
              h('label', { className: 'acm-checkline' },
                h('input', {
                  type: 'checkbox',
                  checked: storageUndoClean,
                  onChange: (event) => setStorageUndoClean(event.target.checked)
                }),
                t('storage.undo.clean')
              )
            ) : null,
            running ? h('div', { className: 'acm-progress' },
              h('span', null, t('storage.progress', {
                phase: phaseText,
                files: job.files,
                total: job.totalFiles,
                done: formatBytes(done),
                size: formatBytes(total)
              })),
              h('div', { className: 'acm-bar' }, h('i', { style: { width: `${percent}%` } }))
            ) : null,
            h('div', { className: 'acm-modalfoot' },
              linked && !running
                ? h('button', {
                  type: 'button',
                  className: 'acm-button',
                  onClick: () => void beginStorage('/relocate-undo', { clean: storageUndoClean })
                }, t('storage.undo'))
                : null,
              h('button', {
                type: 'button',
                className: 'acm-button',
                disabled: running,
                onClick: close
              }, running ? t('storage.running') : t('storage.cancel')),
              !linked && !running
                ? h('button', {
                  type: 'button',
                  className: 'acm-button danger solid',
                  disabled: storageTarget.trim() === '',
                  onClick: () => void beginStorage('/relocate', { target: storageTarget.trim(), mode: storageMode })
                }, t('storage.start'))
                : null
            )
          )
        );
      }

      function renderAside() {
        if (focusItem !== undefined) {
          const showPreview = focusItem.kind === 'image' && focusItem.stored !== false;
          return h('div', { className: 'acm-detail' },
            h('h2', null, t('detail.title')),
            showPreview
              ? h('img', {
                className: 'acm-thumb',
                alt: focusItem.name,
                src: `${API}/preview?digest=${focusItem.digest}`,
                onError: (event) => {
                  event.currentTarget.style.display = 'none';
                }
              })
              : focusItem.kind === 'image'
                ? h('p', null, t('detail.preview.missing'))
                : null,
            h('div', { className: 'acm-kv' },
              h('dt', null, t('detail.kind')), h('dd', null, `${focusItem.kind}${focusItem.bucket !== focusItem.kind ? ` / ${focusItem.bucket}` : ''}`),
              h('dt', null, t('detail.ext')), h('dd', null, focusItem.ext === '' ? '—' : `.${focusItem.ext}`),
              h('dt', null, t('detail.size')), h('dd', null, formatBytes(focusItem.bytes)),
              h('dt', null, t('detail.refs')), h('dd', null, focusItem.orphan === true ? '0' : String(focusItem.refs)),
              focusItem.aliasCount > 0 ? h('dt', null, t('detail.aliases')) : null,
              focusItem.aliasCount > 0 ? h('dd', null, String(focusItem.aliasCount)) : null,
              h('dt', null, t('detail.mtime')), h('dd', null, formatTime(focusItem.mtimeMs)),
              focusSession !== undefined ? h('dt', null, t('detail.session')) : null,
              focusSession !== undefined ? h('dd', null, focusSession.title) : null,
              h('dt', null, t('detail.digest')), h('dd', { className: 'acm-mono' }, focusItem.digest)
            ),
            h('div', { className: 'acm-divider' }),
            h('h3', null, t('detail.impact')),
            h('ul', null, ...impactLines(focusItem, t).map((line, index) => h('li', { key: index }, line))),
            h('button', {
              type: 'button',
              className: 'acm-button danger',
              disabled: busy !== null,
              onClick: () => requestDelete([focusItem.digest])
            }, t('detail.delete'))
          );
        }

        if (derived !== undefined) {
          return h('div', { className: 'acm-detail' },
            h('h2', null, t('detail.empty.title')),
            h('p', null, t('detail.empty.body')),
            h('p', null, t('detail.empty.cache')),
            h('p', null, t('detail.empty.safe')),
            h('div', { className: 'acm-divider' }),
            h('h3', null, t('group.derived')),
            h('p', null, t('group.derived.hint')),
            h('div', { className: 'acm-kv' },
              h('dt', null, 'attachments'), h('dd', null, `${derived.requestImages} · ${formatBytes(derived.requestImageBytes)}`),
              h('dt', null, 'cache'), h('dd', null, `${derived.cacheFiles} · ${formatBytes(derived.cacheBytes)}`)
            ),
            h('button', {
              type: 'button',
              className: 'acm-button',
              disabled: busy !== null || derived.requestImages + derived.cacheFiles === 0,
              onClick: () => void runClearDerived()
            }, busy === 'derived' ? t('toolbar.clearing') : t('toolbar.clearDerived')),
            h('div', { className: 'acm-divider' }),
            h('p', null, t('hint'))
          );
        }

        return h('div', { className: 'acm-detail' }, h('h2', null, t('detail.empty.title')));
      }
    }

    class PanelBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false, message: '' };
      }

      static getDerivedStateFromError(error) {
        return { failed: true, message: String(error?.message ?? error) };
      }

      componentDidCatch(error, info) {
        console.warn('[attachment-cache] panel failed', error, info);
      }

      render() {
        if (this.state.failed) {
          return h('div', { className: 'acm-status error' },
            h('div', null, `Attachment cache panel failed: ${this.state.message}`));
        }
        return this.props.children;
      }
    }

    function PanelShell(props) {
      return h(PanelBoundary, null, h(Panel, props));
    }

    function slotHasEntry(ctx, key, predicate) {
      try {
        const entries = typeof ctx.slots.entriesOfSlot === 'function' ? ctx.slots.entriesOfSlot(key) : [];
        return Array.isArray(entries) && entries.some(predicate);
      } catch {
        return false;
      }
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        let t = fallbackT;
        try {
          let locale;
          try {
            locale = typeof ctx.get === 'function' ? (ctx.get('locale') ?? ctx.locale) : ctx.locale;
          } catch {
            locale = ctx.locale;
          }
          if (locale !== undefined && typeof locale.register === 'function') {
            ctx.effect(() => {
              const disposers = [];
              for (const [language, dict] of Object.entries(DICT)) {
                try {
                  disposers.push(locale.register(NS, language, dict));
                } catch (error) {
                  console.warn('[attachment-cache] locale register failed', error);
                }
              }
              return () => {
                for (const dispose of disposers) {
                  try {
                    dispose?.();
                  } catch {
                    /* already disposed */
                  }
                }
              };
            }, 'attachment-cache: locale');
            if (typeof locale.bind === 'function') {
              const bound = locale.bind(NS);
              t = (key, params) => bound(key, params);
            }
          }
          const translate = (key, params) => t(key, params);

          if (!slotHasEntry(ctx, 'sidebar.panellist', (entry) => entry?.id === PANEL_ID)) {
            ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 40,
              locale: NS,
              label: () => translate('panel')
            }, IconPanel));
          }

          if (!slotHasEntry(ctx, 'main', (entry) => entry?.key === PANEL_ID)) {
            ctx.slots.inject('main', () => ctx.slots.register({
              name: 'main',
              key: PANEL_ID,
              locale: NS
            }, PanelShell));
          }
        } catch (error) {
          console.warn('[attachment-cache] client setup failed', error);
        }
      }
    };
  }
});
