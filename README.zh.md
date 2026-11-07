# dsh-attachment-cache

<img src="assets/icon-180.png" width="64" align="right" alt="">

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | 中文

DeepSeek Harness 的侧栏面板：按对话列出 `~/.dsh/attachments` 里到底存了什么，选中即可看到「删掉之后会怎样」，确认后批量删除；也能把整个存储搬到别的磁盘，旧对话仍然能正常引用。

## 为什么需要它

你在对话里附上的每张图片、每个文件，以及工具返回的每张图片，都会以「内容寻址」的不可变对象写进 `~/.dsh/attachments/v1`：普通图片是 `objects/<sha256>`，文件是 `file-objects/<sha256>` 加一个 `files/<sha256>/<文件名>` 硬链接。

Harness 从来不删它们：没有垃圾回收、没有保留策略、没有淘汰机制；直接退出 `dsh` 也不会清理这个目录。它只会一直变大——几个带 TIFF、PDF 或截图的对话就能占掉几个 GB。

DSH 的界面里看不到「哪个对话占了多少字节」，也不知道手动删掉一个文件会发生什么。这个插件补上这两件事。

## 功能

- **按对话归类**：每个已存对象都能映射回引用它的对话，按「图片 / 文档 / 其他」分组，组标题就是那条对话的提问。
- **删除前解释**：选中一行会说明它是什么、被几个对话共用、删掉后具体哪一步会失效——内容是去重的，同一个对象可能被多个对话引用。
- **批量选择**：分组内「全选本组」、当前筛选下「全选当前」，或逐个勾选，最后统一确认删除。
- **无引用清理**：没有任何对话再引用的对象单独列出，可安全回收。
- **派生缓存清理**：`~/.dsh/cache/attachments`（请求图片）可随时清掉，用到时会重新生成。
- **修改存储位置**：把存储复制到其他磁盘、逐条校验摘要，再把原目录换成 NTFS 目录联接（junction）。旧对话靠内容摘要引用，不依赖路径，所以照常可读。提供「移动 / 保留副本 / 切换」三种模式和一键「还原」。
- **对会话只读**：面板只读取会话日志来判断摘要属于哪个对话，从不改写它们。

## 安装

```sh
dsh plugin --profile web add github:junecattle/dsh-attachment-cache
```

重启 DSH → **设置 → 插件** → 启用「附件缓存管理」→ 点击侧栏的归档图标。

以后更新重复同一条命令即可。

## 面板用法

| 区域 | 作用 |
| --- | --- |
| 标签页 | `全部`、`图片`、`文档`、`其他`、`无引用`，带实时计数 |
| 搜索 | 匹配文件名、后缀，或拥有该文件的对话标题 |
| 后缀筛选 | 逗号分隔，例如 `tif,pdf` |
| 全选当前 | 选中当前筛选下所有可见项（含折叠的分组） |
| 展开全部 / 收起全部 | 展开或折叠所有对话卡片 |
| 存储位置 | 打开迁移对话框 |
| 重新扫描 | 重新读取存储与会话日志 |
| 删除选中 | 二次确认后删除选中对象 |

鼠标悬停可看到大小、摘要、共用数量与删除影响；点击后固定在右侧详情栏，PNG/JPEG/GIF/WebP 会显示预览。

## 删除的实际影响

| 删除对象 | 影响 |
| --- | --- |
| 图片对象 | 引用它的对话里该图片不再显示；文字与工具输出不受影响 |
| 文件对象 | 原始文件无法再被下载或再次读取，`files/` 下的别名一并消失 |
| `files/<sha>/<文件名>` 别名 | 只影响这个显示名，对象仍可被其他名字使用 |
| `~/.dsh/cache/attachments` | 无永久影响，请求图片会按需重建 |
| 无引用对象 | 无影响，没有任何会话指向它 |

删除不可恢复（不进回收站），所以面板会先展示影响、再确认一次。

## 把存储搬到别的磁盘

`~/.dsh/attachments/v1` 仍是逻辑路径，Harness 配置与所有已有引用都不需要改，只是数据实际落在你选的目录：

1. `存储位置 → 选择目标文件夹`（例如 `D:\dsh-attachments`）。
2. 选择模式：
   - **移动**：复制 → 逐条校验 → 删除旧副本 → 建立 junction，释放 `C:` 空间。
   - **保留副本**：同上，但旧目录改名为 `v1.backup-<时间戳>` 保留。
   - **切换**：直接指向一个已存在的存储，不复制。
3. 后台执行并显示进度（文件数 / 字节 / 阶段），期间可以关闭面板稍后再看。
4. **还原**：把数据复制回来、移除 junction、恢复成普通目录。

注意：

- junction 是 Windows 特性，迁移仅在 Windows 11 + Node 22 以上验证；目标须是本地 NTFS 卷。
- junction 对 `dsh` 是透明的，但不跟随重解析点的备份工具会把它当成空目录。
- `~/.dsh/cache` 下的派生缓存仍留在 `C:`，体积小且可重建。
- 目标磁盘被拔掉时，附件读取会失败直到 junction 恢复，面板会如实报错而不是静默。

## 工作原理

- **宿主侧**（`index.js`）在 `/attachment-cache-manager` 下注册路由，由宿主的连接防护校验；读取附件存储（`objects`、`file-objects`、`files`、`request-images`）与会话日志（`~/.dsh/sessions/<workspace>/<session>/session.v4.jsonl.zstd`，多帧 zstd），把 `sha256:<摘要>` 映射到对话。
- **界面侧**（`client.js`）注册 `sidebar.panellist` 图标与键控 `main` 页面，文案全部走客户端 locale。
- 只有显式 `POST /delete`（且经过确认对话框）才会真正删除。

插件不调用 DSH 附件服务的内部实现，也不写会话日志，因此 DSH 升级不会经由它损坏数据。

## 兼容性

- DeepSeek Harness ≥ 0.2.1，`web` 配置档
- Node ≥ 20（会话日志解码依赖 `zlib.zstdDecompress`）
- 存储迁移仅 Windows 11 验证；浏览与删除跨平台可用

## 隐私

全部本地完成。面板只读 `~/.dsh` 下的文件，预览通过你自己 DSH 实例的本地鉴权路由返回，不上传任何数据。

## 开发

```sh
npm run check                          # 以 ESM 方式检查 index.js 与 client.js 语法
node scripts/publish.mjs "feat: ..."   # 通过 REST API 发布到 GitHub（不依赖 git 推送）
```

目录结构：

```
index.js            宿主侧：清单、删除、迁移路由
client.js           界面侧：侧栏图标与面板页
locale/{en,zh}.json 插件显示名与描述
icon.svg            侧栏图标
cordis.patch.yml    bundle 补丁
market/             提交给 awesome-dsh-plugin 的条目
scripts/            校验与发布脚本
```

## 许可证

[MIT](LICENSE)
