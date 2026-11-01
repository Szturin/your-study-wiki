# 843 信号与系统真题墙

中科大 843 真题复盘工具。左侧按**分类**或**套卷**进入练习；题目页支持掌握标记、收藏、笔记、草稿和复制 LaTeX 源码。真题掌握可按章节或年份查看。

英语一已整合为站内页面，包含 2000—2026 阅读文章与题目、词汇和词组复习、精读知识点、大小作文模板及写作练习。阅读设置支持明暗主题、字号、行距和阅读宽度。每日阅读和作文生成仍使用 Vault 中的本机服务。

## 内容边界

- 收录 1997—2026 年 30 份年度卷、345 个题目单元、14 个分类章节，以及公式与知识点卡片。
- 题面采用已整理分类册的题目区域，保留公式与图像；搜索使用 PDF 文本层，可能不含题图中的文字。
- 2025 年第一大题第 7、8 小题缺失，第 4 小题选项不全。尚未导入正式答案或解析；345 是已收录单元数，不代表原卷无缺损。
- 明文题库和原始 PDF 只留在本机的 `src/lib/ustc843-*.json`、`public/843/`，均被 Git 忽略；网页发布 `protected/` 中的 AES-GCM 密文。
- 英语原始 HTML 不进入静态目录。`protected/english.enc` 保存提取后的加密内容，使用同一配对密钥解锁。

## 运行与发布

环境：Node.js 24、npm。安装依赖后，在项目目录执行：

```powershell
npm ci
npm run hydrate:protected
$env:NEXT_PUBLIC_BASE_PATH='/your-study-wiki'
npm run build
npm run typecheck
npm run lint
npm run test:integrity
```

`npm run build` 会先从 `protected/` 注入最新密文，再生成 `out/`。`npm run sync:pages` 将静态导出同步到仓库根目录，供 GitHub Pages 使用。该脚本会跳过 `out/843/` 明文附件；仓库根目录只发布加密的 `protected/`。发布前检查 `git status`，不要提交明文题库、PDF、密钥或本机浏览器资料。

Windows 开始菜单的“843 信号与系统真题墙”使用 `scripts/launch-local.ps1`：它在空闲端口启动 `scripts/serve-local.mjs`，仅监听 `127.0.0.1`，服务 `out/` 并打开浏览器。首次使用需要构建 `out/`；本地入口保存的设备授权可自动解锁。本地服务与线上页面是不同浏览器来源，学习记录通过各自的 GitHub 连接同步。

## 加密资源更新

`protected/manifest.json` 中的盐值与现有设备授权、云端记录共用。更新题库时，设置现有配对密钥到当前进程的 `WALL_PASSPHRASE`，然后依次运行：

```powershell
node scripts/prepare-protected.mjs
npm run hydrate:protected
$env:NEXT_PUBLIC_BASE_PATH='/your-study-wiki'
npm run build
npm run sync:pages
```

准备脚本会验证现有密文与密钥，沿用盐值，并只重加密内容变化的文件。错误密钥会在写入前失败。不要删除或手动轮换 `protected/manifest.json`；如确需轮换，必须同时迁移所有设备授权与云端记录。`npm run test:integrity` 包含独立的加密准备与同步合并测试，不使用真实题库或密钥。

英语来源 HTML 更新后，在设置 `WALL_PASSPHRASE` 的同一终端运行 `node scripts/prepare-english.mjs`，再构建。默认从 Vault 的 `2-英语/` 读取；其他位置可设置 `ENGLISH_VAULT_ROOT`。英语原 HTML 的 `file://` 学习记录不会自动迁移到网站来源。站内英语答题、词汇掌握、FSRS、写作草稿、每日阅读缓存与阅读偏好复用现有加密 GitHub 自动同步。

## 学习记录同步

学习记录先保存在浏览器 `localStorage`。连接仅授权 `Szturin/your-study-wiki` 仓库、具有 Contents 读写权限的 GitHub fine-grained PAT 后，网页自动将记录加密写入 `study-sync` 分支的 `sync/843-state.enc`。本地修改、重新联网、页面唤醒和定时检查都会触发同步；失败会退避重试。同步分支独立于 Pages 的 `main`，避免每次学习记录更新都触发整站发布。

GitHub Pages 本身没有服务端登录。题库依赖配对密钥加密；设备授权保存在当前浏览器的 IndexedDB，GitHub PAT 用同一密钥加密后保存在该浏览器。已授权的浏览器可直接打开题库，因此共享设备前应清理浏览器站点数据。离线时可使用已载入的页面和本地学习记录，但当前 Service Worker 不缓存完整题库，不能保证断网后重新打开页面。

## 维护文档

- [当前工程状态](docs/project-status.md)
- [数据规则](docs/question-bank-data-rules.md)
- [前端规范](.trellis/spec/frontend/index.md)

旧版架构、OCR 和参考站研究文档保留为历史资料；当前产品行为以本 README 和运行代码为准。
