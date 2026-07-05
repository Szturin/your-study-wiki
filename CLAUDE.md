# CLAUDE.md

本文件用于给后续 Claude / Codex / AI 开发会话提供 **快速项目上下文**。

详细规则以 `AGENTS.md` 与 `.trellis/spec/frontend/` 为准。

---

## 1. 项目定位

`study-wiki-wall` 是一个面向考研信号与系统复习的 **题型分类 Wiki 墙前端项目**。

当前定位：

- 做题库浏览、题型组织、错题本、收藏本和算法演示的前端工作台
- 验证 `科目 -> 章节 -> 知识点 -> 题型 -> 题目` 的产品模型
- 让远程访问 GitHub Pages 的每个用户把学习状态保存在自己的浏览器本地
- 为后续 AI 导入教材 / 真题 / 习题册 / 讲义做前后端规则准备

---

## 2. 当前技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Markdown + GFM
- KaTeX 数学渲染
- GitHub Pages 静态托管

---

## 3. 当前核心文件

### 页面与交互

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/components/dashboard/study-wall-dashboard.tsx`
- `src/components/dashboard/signal-algorithm-lab.tsx`
- `src/hooks/use-study-wall-dashboard.ts`

### 领域模型与数据

- `src/types/study-wall.ts`
- `src/lib/mock-study-wall.ts`
- `src/lib/signal-system-import.ts`

### Markdown / LaTeX / PWA

- `src/components/ui/math-markdown.tsx`
- `src/components/system/pwa-register.tsx`
- `src/app/manifest.ts`
- `src/app/globals.css`

### 构建与发布

- `next.config.ts`
- `scripts/sync-static-export.mjs`

---

## 4. 当前已完成的主要内容

- 信号与系统学习工作台
- 左侧章节/知识点可展开目录
- 首页、题目工作台、错题本、收藏本
- 错题本 / 收藏本列表视图与导图视图
- 导图拖拽、缩放、全屏、树形布局、分组框架布局
- 掌握 / 错题 / 收藏状态切换
- 收藏取消确认和“本日内不再提醒”
- 题目答案 / 解析向下展开
- Markdown + LaTeX 渲染
- 信号与系统算法演示页：CFS、CTFT、Z、S、DTFT、DFS、DFT、FFT 等
- 入场示波器风格加载动画与像素显现过渡
- 本地浏览器持久化：掌握状态、错题、收藏、最近掌握记录

---

## 5. 当前默认行为

- 页面默认优先打开 `signal-system`
- 当前只保留信号与系统科目
- 学习状态保存在访问者自己的浏览器 localStorage 中，不写入 GitHub Pages 服务器
- 静态部署路径使用 `/your-study-wiki`

---

## 6. 当前重要文档

- `README.md`
- `docs/project-status.md`
- `docs/architecture/frontend-foundation.md`
- `docs/architecture/fullstack-and-hosting-plan.md`
- `docs/TODO.md`
- `docs/ai-ocr-import-rules.md`
- `docs/question-bank-data-rules.md`
- `docs/research/zhentiqiang-open-front-end-analysis.md`
- `.trellis/spec/frontend/index.md`

---

## 7. 约束与注意事项

1. 当前题库数据仍是前端 seed/import 数据，不是正式后端数据库
2. 不要把竞品原始接口字段直接引入 UI 类型
3. 保持 clean-room 原则
4. 文档默认写中文，Trellis spec 默认写英文
5. 无正式后端前，不要把前端结构和未来数据库结构硬绑定
6. 用户学习状态是 local-first，不要写入静态源文件或生成产物
7. localStorage 结构已带 schema version，破坏性变更前要写迁移或清洗策略
8. App Router 相关改动前先读 `node_modules/next/dist/docs/` 对应指南

---

## 8. 发布流程

GitHub Pages 当前从仓库根目录提供静态文件。发布前执行：

```bash
NEXT_PUBLIC_BASE_PATH=/your-study-wiki npm run build
npm run sync:pages
```

然后再提交源文件和同步后的静态导出产物。

---

## 9. 当前待办方向

- 正式题库类型：`src/types/question-bank.ts`
- AI 导入 schema
- 题图/原图嵌入
- 真实 API 接入
- 用户登录后的跨设备学习状态同步
- Cloudflare 或其他托管方案落地
