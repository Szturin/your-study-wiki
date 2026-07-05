# Study Wiki Wall

Study Wiki Wall 是一个面向考研场景的 **题型分类 Wiki 墙前端工程**。  
当前聚焦科目：

- 信号与系统

它的目标不是做“刷题页复刻”，而是做一个更适合长期整理题库、知识点、题型和掌握状态的学习工作台。

---

## 1. 当前工程状态

当前已经完成：

- 基于 **Next.js App Router + TypeScript + Tailwind CSS 4** 的前端骨架
- 首页仪表盘 + 左侧章节/知识点树 + 题目工作台布局
- 左右区域独立滚动
- 题目单卡视图与概览视图切换
- 题目答案 / 解析向下展开
- 掌握、错题、收藏状态切换
- 收藏状态与掌握状态解耦
- 同科目独立统计、错题本、收藏本
- 公式与富文本渲染支持：**Markdown + GFM + LaTeX(KaTeX)**
- 信号与系统算法演示页：CFS、CTFT、Z、S、DTFT、DFS、DFT、FFT 等
- 信号与系统郑君里教材做题本导入：第一章 `1.1` 到 `1.24`、第二章 `2.1` 到 `2.25`
- 面向后续 AI 批量导入的题库数据规则文档
- AI OCR 导入规则文档
- 前后端设计与 Cloudflare 托管方案文档
- Trellis 工程管理结构接入
- 公开竞品前端快照与 clean-room 研究文档沉淀

当前仍然属于：

- **前端原型 / 数据结构验证阶段**
- 当前题库数据仍以 `mock` 数据驱动
- 掌握 / 错题 / 收藏状态以浏览器 localStorage 本地优先持久化，尚未接入后端同步

---

## 2. 当前产品结构

前端当前采用的学习墙结构为：

```text
科目
  -> 章节
    -> 知识点
      -> 题型组
        -> 题目
```

其中界面交互逻辑为：

- 点击 **章节 / 知识点**：进入概览视图
- 点击 **具体题目**：进入单题卡片视图
- 单题卡片显示：
  - 题目
  - 解题抓手
  - 掌握状态
  - 所属章节 / 知识点 / 题型 / 题源

---

## 3. 已落地的数据内容

### 3.1 信号与系统

当前重点完成了《郑君里〈信号与系统第三版〉做题本》前两章的前端展示整理：

- 第 1 章：`1.1` 到 `1.24`
- 第 2 章：`2.1` 到 `2.25`
- 题面保留教材 / PDF 页码提示，图题原图接入仍在后续计划中

说明：

- 当前导入数据经过人工整理为适合前端展示的结构化题目卡片
- 不是后端正式库表，也不是最终权威校对版

---

## 4. 技术栈

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **react-markdown**
- **remark-math**
- **rehype-katex**
- **KaTeX**

---

## 5. 项目目录

```text
src/
  app/
    globals.css                # 全局样式
    layout.tsx                 # 根布局、metadata、PWA 注册入口
    manifest.ts                # Web app manifest
    page.tsx                   # 首页 server entry
  components/
    dashboard/
      study-wall-dashboard.tsx # 主工作台界面、错题本、收藏本、导图
      signal-algorithm-lab.tsx # 信号与系统算法演示
    system/
      pwa-register.tsx         # Service worker 注册
    ui/
      math-markdown.tsx        # Markdown + LaTeX 渲染组件
      section-card.tsx         # 轻量 UI 壳组件
  hooks/
    use-study-wall-dashboard.ts # 页面状态、选择逻辑、筛选逻辑
  lib/
    mock-study-wall.ts         # 当前前端种子数据
    signal-system-import.ts    # 信号与系统导入数据
  types/
    study-wall.ts              # 前端领域模型

docs/
  architecture/
    frontend-foundation.md     # 前端架构基线
    fullstack-and-hosting-plan.md # 前后端设计与托管方案
  research/
    zhentiqiang-open-front-end-analysis.md
  ai-ocr-import-rules.md       # AI OCR 导入标准规则
  project-status.md            # 当前工程状态总结
  TODO.md                      # 当前待办路线图
  question-bank-data-rules.md  # 后续后端/AI 导入规则

research/
  target-site-snapshot/        # 公开页面与公开接口快照

scripts/
  fetch-target-site-snapshot.mjs
  sync-static-export.mjs       # 同步 out/ 到仓库根目录供 GitHub Pages 使用

.trellis/
  workflow.md
  spec/
  workspace/
```

---

## 6. 开发命令

安装依赖：

```bash
npm install
```

本地开发：

```bash
npm run dev
```

质量检查：

```bash
npm run lint
npm run typecheck
```

生产构建：

```bash
npm run build
```

GitHub Pages 静态导出同步：

```bash
NEXT_PUBLIC_BASE_PATH=/your-study-wiki npm run build
npm run sync:pages
```

保存公开站点快照（研究用途）：

```bash
npm run snapshot:target
```

---

## 7. 数学公式支持

当前题干、解题抓手、步骤说明支持：

- 普通 Markdown 文本
- 行内公式：`$...$`
- 块公式：`$$...$$`

例如：

```md
$f_1(t)=\left(1-\frac{|t|}{2}\right)\left[\varepsilon(t+2)-\varepsilon(t-2)\right]$
```

渲染链路：

```text
QuestionEntry.prompt / note / strategy
  -> MathMarkdown
  -> react-markdown
  -> remark-math
  -> rehype-katex
  -> KaTeX CSS
```

---

## 8. clean-room 研究边界

本项目允许：

- 分析公开可见页面结构
- 分析公开静态资源与公开接口表面
- 保存公开 HTML / CSS / JS / JSON 快照用于研究
- 抽象“功能需求”和“产品结构”

本项目不做：

- 直接复制目标站点源码
- 登录态绕过
- 私有数据获取
- 后端实现逆向利用
- 原样复刻对方品牌、文案和 UI

---

## 9. 为什么当前主架构不是 Astro

当前产品更像一个高交互学习工作台，而不是纯内容站。

核心需求包括：

- 题目选择与切换
- 掌握状态记录
- 章节/知识点/题型树联动
- 后续接入评论、资源、题库、用户态

因此当前主站优先采用 **Next.js**。  
如果后续需要：

- 官网
- 帮助中心
- 文档站
- 博客/SEO 内容页

再评估把 **Astro** 用作外围内容层。

---

## 10. 当前限制

当前版本仍有以下限制：

1. **没有正式后端**
2. **掌握 / 错题 / 收藏状态仅本地持久化，未跨设备同步**
3. **视频 / 笔记 / 纠错仍是占位入口**
4. **题目原图尚未嵌入卡片**
5. **教材做题本导入仍是前端展示友好的整理版，不是完整数据库入库版**
6. **尚未完成 AI 批量导入流水线**

---

## 11. 后续文档

- `docs/TODO.md`
- `docs/project-status.md`
- `docs/architecture/frontend-foundation.md`
- `docs/architecture/fullstack-and-hosting-plan.md`
- `docs/question-bank-data-rules.md`
- `docs/ai-ocr-import-rules.md`

## 11. 下一步建议

推荐后续优先级：

### Phase A：题库与导入

- 定义正式 `question-bank` TypeScript 契约
- 建立 AI 导入 JSON schema
- 做 PDF / 文档 / 习题册的导入流水线
- 建立去重策略与审核状态

### Phase B：真实数据接入

- 接后端 API
- 接题目持久化
- 接用户掌握状态
- 接知识点/章节后台配置

### Phase C：题目增强

- 题图 / 原图嵌入
- 解析折叠
- 多来源题目聚合
- 错题 / 收藏 / 二刷标记

---

## 12. Trellis 工作流

开始新会话前建议优先查看：

- `AGENTS.md`
- `.trellis/workflow.md`
- `.trellis/spec/frontend/index.md`
- `CLAUDE.md`

---

## 13. 相关文档

- `CLAUDE.md`
- `docs/project-status.md`
- `docs/architecture/frontend-foundation.md`
- `docs/question-bank-data-rules.md`
- `docs/research/zhentiqiang-open-front-end-analysis.md`
