# AI OCR 题目卡导入标准规则

> 更新时间：2026-04-25  
> 适用范围：Study Wiki Wall 后续通过 OCR + LLM 导入题目卡片的标准流程。  
> 目标：让 AI 导入结果稳定、可审计、可纠错、可入库，而不是一次性生成不可控内容。

---

## 1. 设计目标

本规则用于约束以下链路：

`原始资料 -> OCR -> 页面切块 -> LLM 抽取题目卡 -> 人审 -> 发布入库`

导入流程必须满足：

1. **来源可追溯**：每道题都能回到原始文档、页码、题号、截图区域。
2. **中间结果可保存**：OCR 文本、页面块、AI 草稿都必须留档。
3. **AI 输出可审查**：LLM 只能生成草稿，不能直接成为正式题库真值。
4. **字段结构稳定**：不同模型、不同批次、不同资料来源，输出格式都一致。
5. **支持重跑**：允许按任务、按页、按题重跑 OCR 或抽取。
6. **前后端解耦**：导入结构不直接等于前端展示结构，需要投影层转换。

---

## 2. 导入流程标准

推荐统一拆成 6 个阶段：

### 2.1 创建导入任务

输入：

- 科目
- 资料类型
- 来源信息
- 上传文件

输出：

- `importJobId`
- 原始文件记录
- 当前任务状态

### 2.2 OCR 与版面分析

输入：

- PDF / 图片 / 扫描页

输出：

- 页级文本
- block 级文本
- block 坐标
- 公式识别结果
- OCR 置信度

### 2.3 题目切分

输入：

- OCR 页结果
- 版面块信息

输出：

- 候选题目片段
- 题号范围
- 起止页
- 关联 block 列表

### 2.4 LLM 题目卡抽取

输入：

- 候选题目片段
- OCR 文本
- 来源元信息

输出：

- 结构化题目卡草稿
- 字段级置信度
- 可疑项标记

### 2.5 人工审核

输入：

- 题目卡草稿
- 原图
- OCR 原文

输出：

- 审核通过 / 驳回 / 需重跑

### 2.6 正式发布

输入：

- 审核通过草稿

输出：

- 正式 `question`
- 关联 `solution / asset / sourceDocument`

---

## 3. 必须保存的实体

导入系统至少保存以下 7 类实体：

### 3.1 SourceDocument

原始资料记录。

### 3.2 ImportJob

一次导入任务，负责追踪任务生命周期。

### 3.3 OcrPage

单页 OCR 结果。

### 3.4 OcrBlock

页面内的文本块、公式块、图片区块。

### 3.5 QuestionDraft

AI 生成的题目卡草稿。

### 3.6 ReviewItem

供人工审核的工作项。

### 3.7 PublishedQuestion

审核通过后进入正式题库的题目。

---

## 4. SourceDocument 字段标准

```ts
type SourceDocument = {
  id: string;
  subjectId: string;
  title: string;
  sourceKind: "real_exam" | "workbook" | "mock_exam" | "textbook" | "lecture_note" | "other";
  organization?: string;
  year?: number;
  edition?: string;
  language?: "zh-CN" | "en";
  originalFileName: string;
  originalPath: string;
  fileFormat: "pdf" | "image" | "zip" | "other";
  pageCount?: number;
  importedAt: string;
};
```

必填字段：

- `id`
- `subjectId`
- `title`
- `sourceKind`
- `originalFileName`
- `originalPath`
- `fileFormat`
- `importedAt`

---

## 5. ImportJob 字段标准

```ts
type ImportJob = {
  id: string;
  sourceDocumentId: string;
  subjectId: string;
  status: "created" | "uploaded" | "ocr_running" | "ocr_done" | "extracting" | "review_pending" | "completed" | "failed";
  ocrEngine?: string;
  llmModel?: string;
  totalPages?: number;
  processedPages?: number;
  totalDrafts?: number;
  approvedDrafts?: number;
  failedReason?: string;
  createdAt: string;
  updatedAt: string;
};
```

说明：

- `status` 必须可观察，不能只有“成功/失败”两态
- `failedReason` 必须可记录，便于排障和重试

---

## 6. OCR 结果标准

### 6.1 OcrPage

```ts
type OcrPage = {
  id: string;
  importJobId: string;
  pageNo: number;
  pageImagePath: string;
  rawText: string;
  confidence?: number;
  width?: number;
  height?: number;
};
```

### 6.2 OcrBlock

```ts
type OcrBlock = {
  id: string;
  ocrPageId: string;
  blockType: "text" | "formula" | "image" | "table" | "question_no" | "unknown";
  text: string;
  latex?: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence?: number;
  readingOrder?: number;
};
```

规则：

1. OCR 原文不可被 LLM 回写覆盖。
2. 坐标信息必须保留，后续切题和高亮需要用。
3. 公式识别失败时，也要保留原始文本，不得直接丢弃。

---

## 7. QuestionDraft 标准

这是一份 AI 输出草稿，不是正式题库。

```ts
type QuestionDraft = {
  id: string;
  importJobId: string;
  subjectId: string;
  sourceDocumentId: string;
  pageStart: number;
  pageEnd?: number;
  sourceQuestionNo?: string;
  title: string;
  stem: string;
  stemLatex?: string;
  answer?: string;
  answerLatex?: string;
  analysis?: string;
  knowledgePointLabels: string[];
  typeGroupLabel?: string;
  questionType: "choice" | "multiple_choice" | "blank" | "calculation" | "proof" | "analysis" | "other";
  difficulty?: "basic" | "medium" | "hard";
  tags: string[];
  assetRefs: string[];
  confidence: number;
  warnings: string[];
  reviewStatus: "ai_draft" | "review_pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};
```

### 7.1 字段约束

- `title`：允许概括，但不能脱离原题语义
- `stem`：必须尽量保留原题内容
- `analysis`：允许为空
- `knowledgePointLabels`：可以先是标签，正式入库时再映射到 ID
- `confidence`：范围必须是 `0 ~ 1`
- `warnings`：用于提示低置信度、题号不清、题干缺失、公式可疑等风险

### 7.2 LLM 禁止行为

LLM 在抽取草稿时禁止：

1. 编造不存在的题干内容
2. OCR 看不清时强行补全具体数字
3. 把解析伪装成原题答案
4. 伪造知识点 ID
5. 跳过低置信度标记

---

## 8. ReviewItem 标准

```ts
type ReviewItem = {
  id: string;
  draftId: string;
  reviewerId?: string;
  status: "pending" | "approved" | "rejected" | "needs_rerun";
  reviewNote?: string;
  reviewedAt?: string;
};
```

规则：

- 所有 AI 草稿都必须经过审核才能发布
- 审核页面必须同时能看：
  - 原图
  - OCR 文本
  - AI 草稿
  - 结构化字段

---

## 9. 正式发布规则

只有满足以下条件的草稿才能发布：

1. `reviewStatus = approved`
2. 来源资料存在
3. 至少有有效 `subjectId`
4. 至少有有效 `title + stem`
5. `pageStart` 合法
6. 关键字段未缺失到不可用程度

发布后需要进入正式题库实体：

- `questions`
- `solutions`
- `assets`
- `question_source_locator`

---

## 10. 目录与文件组织标准

推荐目录：

```text
data/
  incoming/
    math/
    signal-system/
  imports/
    import-jobs/
    ocr-pages/
    ocr-blocks/
    drafts/
    review/
  normalized/
    questions/
    solutions/
    assets/
```

原则：

- 原始文件不可覆盖
- OCR 中间结果单独存
- AI 草稿单独存
- 发布后的正式数据单独存

---

## 11. 推荐接口

### 11.1 导入任务

- `POST /api/import-jobs`
- `POST /api/import-jobs/:jobId/files`
- `GET /api/import-jobs/:jobId`
- `GET /api/import-jobs/:jobId/events`
- `POST /api/import-jobs/:jobId/retry`

### 11.2 OCR

- `POST /api/ocr-jobs`
- `GET /api/ocr-jobs/:id/pages`
- `GET /api/ocr-jobs/:id/pages/:pageNo/blocks`

### 11.3 AI 抽取

- `POST /api/extraction-jobs`
- `GET /api/extraction-jobs/:id/results`
- `POST /api/extraction-jobs/:id/re-extract`
- `POST /api/extraction-jobs/:id/split-question`
- `POST /api/extraction-jobs/:id/merge-question`

### 11.4 审核与发布

- `GET /api/review-queue`
- `GET /api/review-items/:id`
- `PATCH /api/review-items/:id`
- `POST /api/review-items/:id/approve`
- `POST /api/review-items/:id/reject`
- `POST /api/review-items/:id/publish`

---

## 12. 错误处理规则

以下情况必须进入异常流程：

1. OCR 文本为空
2. 题号缺失且无法切题
3. 公式识别大量损坏
4. 题干与答案混在一起无法拆分
5. 多题被识别成一题
6. 一题被错误拆成多题

处理方式：

- 标记 `warnings`
- 允许人工修正
- 允许按页重跑
- 允许按题重抽取

---

## 13. MVP 最小落地建议

第一版先只做以下能力：

1. 上传 PDF / 图片创建 `importJob`
2. 保存 OCR 页和 OCR block
3. 生成 `questionDraft`
4. 人工审核修改草稿
5. 审核通过后发布为正式 `question`

先不要急着做：

- 全自动发布
- 复杂权限系统
- 批量智能去重
- 多版本解析协同编辑

---

## 14. 和前端的关系

前端学习墙不要直接消费 `QuestionDraft`。

正确关系是：

- 导入系统产出 `questionDraft`
- 审核后发布成正式 `question-bank` 数据
- 再由 adapter 投影到前端 `study-wall` 结构

这样可以保证：

- 前端字段稳定
- 导入系统可以迭代
- 数据库结构不会被 UI 偶然绑定

---

## 15. 下一步建议

建议按下面顺序推进：

1. 先定义 `QuestionDraft JSON Schema`
2. 再定义导入任务与审核接口
3. 然后做最小 OCR -> 草稿 -> 审核 -> 发布闭环
4. 最后再接 AI 自动分类、去重、知识点映射
