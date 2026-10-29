# 843 信号与系统真题墙

面向中科大 843 二轮复盘的本地学习工作台，左侧导航提供 **分类 / 套卷** 两个主入口。

- 分类：沿用现有分类册的章节与题型，包含 13 个主章节和历史信息论附录；IIR 排在 FIR 前。
- 套卷：按 1997—2026 年及原题号浏览，提供 30 份年度 PDF。
- 共用 345 个已收录题目单元；分类与套卷共享掌握状态、收藏、笔记和草稿。
- 章节、子题型和年份目录点击后直接看题；两侧固定箭头切题。
- 真题掌握独立提供分类 / 年份、学习进度 / 题目地图视图，支持状态、收藏和笔记筛选；从练习返回保留筛选。
- 收藏本和公式与知识点使用独立全宽界面，不占首页右侧内容区。
- 字体、对比度和阅读行距统一优化，支持手机布局。
- 公式知识点来自考研仓库 2026-10-27 真题校订与方法补强版墨墨卡片，共 217 张、10 个主章节与 1 个历史附录。保留旧卡 ID，修复已确认的公式错误，并新增 16 张对应真题的方法卡；原有 14 张无 ID 卡片与新卡在网页端使用稳定的内容哈希 ID。公式渲染检查不等于逐卡数学审定，也不能承诺未来考点覆盖率。

公式导入：`python -X utf8 scripts/import-momo-formulas.py --source '<源xlsx路径>'`；渲染检查：`node scripts/check-formula-rendering.mjs`。
- 已去除算法演示入口，运行时题库不再使用教材示例。

题面使用已整理分类册的精确题目区域，保留公式、图像和疑点标注；搜索使用 PDF 文本层。当前未导入正式答案或解析。**2025 年第一大题第 7、8 小题缺失，第 4 小题选项不全**，按现有资料明确标注。345 是收录单元数，不代表原卷无缺损。

学习记录仅保存在当前浏览器。843 使用独立状态键，不覆盖此前教材题库记录。

## 数据与更新

- 运行题库：`src/lib/ustc843-bank.json`
- 题面与年度卷：`public/843/`
- 来源、题目裁切范围及哈希审计：`docs/843-import-audit.json`
- 导入脚本：`scripts/import-ustc843.py`（依赖 PyMuPDF、Pillow）

```powershell
python -X utf8 scripts/import-ustc843.py --source 'S:/0_Obsidian/my_study_library/考研/1-843信号与系统/真题/latex'
npm run lint
npm run typecheck
$env:NEXT_PUBLIC_BASE_PATH='/your-study-wiki'
npm run build
npm run sync:pages
```

静态镜像同步包含 `843/`，保证题面和 PDF 路径有效。以下旧工程文档中的教材、算法研究记录保留作历史参考，当前产品以此说明和运行题库为准。

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
