# CLAUDE.md

本文件用于给后续 Claude / Codex / AI 开发会话提供 **快速项目上下文**。

详细规则以 `AGENTS.md` 为准。

---

## 1. 项目定位

`study-wiki-wall` 是一个面向考研整理场景的 **题型分类 Wiki 墙前端项目**。

当前定位：

- 做题库浏览与题型组织的前端工作台
- 验证 `科目 -> 章节 -> 知识点 -> 题型 -> 题目` 的产品模型
- 为后续 AI 导入教材 / 真题 / 习题册 / 讲义做前后端规则准备

---

## 2. 当前技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- KaTeX 数学渲染

---

## 3. 当前核心文件

### 页面与交互

- `src/app/page.tsx`
- `src/components/dashboard/study-wall-dashboard.tsx`
- `src/hooks/use-study-wall-dashboard.ts`

### 领域模型与数据

- `src/types/study-wall.ts`
- `src/lib/mock-study-wall.ts`

### 数学渲染

- `src/components/ui/math-markdown.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

---

## 4. 当前已完成的主要内容

- 首页仪表盘
- 左侧章节/知识点可展开目录
- 题目工作台与概览 / 单题卡片双视图
- 左右区域独立滚动
- 掌握 / 错题 / 收藏 状态切换
- 题目答案 / 解析向下展开
- Markdown + LaTeX 渲染
- 信号与系统白皮书第 1 章例题 1.1 ~ 1.10 导入

---

## 5. 当前默认行为

- 页面默认优先打开 `signal-system`
- 第一章默认展示：`信号的函数表示与系统分析方法`

这是为了方便继续补录信号与系统内容。

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

---

## 7. 约束与注意事项

1. 当前题库数据仍是 `mock-study-wall.ts`
2. 不要把竞品原始接口字段直接引入 UI 类型
3. 保持 clean-room 原则
4. 文档默认写中文
5. 无正式后端前，不要把前端结构和未来数据库结构硬绑定
6. 当前用户状态仍未持久化，刷新页面会丢失

---

## 8. 当前待办方向

- 正式题库类型：`src/types/question-bank.ts`
- AI 导入 schema
- 题图/原图嵌入
- 掌握 / 错题 / 收藏状态持久化
- 真实 API 接入
- Cloudflare 托管落地
