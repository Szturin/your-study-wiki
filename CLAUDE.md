# 项目上下文

本仓库是中科大 843 信号与系统真题墙。当前功能和维护命令以 [README.md](README.md) 为准；本文件只保留给开发会话的快速入口。先读 `AGENTS.md` 和 `.trellis/spec/frontend/index.md`。

## 当前产品

- 1997—2026 年真题按分类和套卷浏览，题目、公式、题图由加密资源加载。
- 做题页支持“熟悉 / 模糊 / 不会”、收藏、笔记、草稿、LaTeX 源码复制；真题掌握可按章节或年份查看。
- 学习记录本地优先；用户连接 GitHub PAT 后，自动同步至 `study-sync` 分支的加密文件。
- GitHub Pages 提供静态页面和密文，没有服务端登录。Windows 开始菜单入口在本机运行 `out/` 静态构建。

## 关键位置

- `src/components/dashboard/study-wall-dashboard.tsx`：做题与浏览界面。
- `src/components/system/protected-gate.tsx`、`src/lib/protected-content.ts`：解锁与资源解密。
- `src/components/system/github-sync.tsx`、`src/lib/sync-record.ts`：跨端同步与记录合并。
- `src/hooks/use-study-wall-dashboard.ts`、`src/hooks/use-learning-journal.ts`：本地学习状态。
- `scripts/prepare-protected.mjs`、`scripts/hydrate-protected.mjs`：加密资源更新。
- `scripts/serve-local.mjs`、`scripts/launch-local.ps1`：Windows 本地入口。
- `scripts/sync-static-export.mjs`：GitHub Pages 静态镜像。

## 维护约束

- 不提交 `src/lib/ustc843-*.json`、`public/843/`、配对密钥、GitHub PAT 或浏览器资料。
- 更新密文时保留现有 `protected/manifest.json` 盐值，除非同步迁移设备授权和云端记录。
- 发布前运行 `npm run lint`、`npm run typecheck`、`npm run test:integrity`、带 `/your-study-wiki` base path 的构建，并检查静态镜像中没有明文题库。
- `docs/project-status.md` 记录当前工程状态；早期 `docs/TODO.md` 和架构研究文档为历史规划。
