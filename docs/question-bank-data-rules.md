# 题库后端数据规则 v0.2

> 适用范围：My 0854 WIKI墙 后续导入的教材、试卷、习题册、讲义、题解、模拟题与 AI 抽取流程。  
> 目标：让 **AI 模型导入**、**后端存储**、**前端展示**、**人工校对** 使用同一套稳定数据规则。

---

## 1. 设计目标

后端题库数据必须满足：

1. **来源可追溯**：每一道题都能追溯到原文档、页码、题号、版本。
2. **结构可扩展**：先支持数学 / 信号与系统，后续可扩到英语、政治或其他科目。
3. **AI 友好**：字段语义明确，便于模型抽取、补全、纠错、去重。
4. **前端友好**：天然支持 `科目 -> 章节 -> 知识点 -> 题型 -> 题目` 展示。
5. **多源融合**：同一道题允许挂载多个来源、多个解析、多个标签。
6. **审核可控**：AI 输出不直接视为真值，必须保留状态字段。

---

## 2. 顶层实体

后端至少维护以下 8 类实体：

### 2.1 Subject
- 科目
- 例：数学、信号与系统

### 2.2 Chapter
- 章节
- 例：高等数学 / 导数与微分；信号与系统 / 卷积运算

### 2.3 KnowledgePoint
- 知识点
- 比章节更细
- 一道题可关联多个知识点

### 2.4 TypeGroup
- 题型组
- 例：卷积计算题、系统性质判断题、特征值与对角化题

### 2.5 SourceDocument
- 原始文档
- 例：某校 2024 真题 PDF、某习题册第 7 版、某模拟卷

### 2.6 Question
- 题目主实体
- 是系统中最重要的核心表

### 2.7 Solution
- 解析 / 解法 / 备注
- 可有多个版本：AI 初稿、人审版、老师版

### 2.8 Asset
- 附件资源
- 例：原题截图、公式图、PDF 页图、答案页、音视频

---

## 3. 目录与归档规则

推荐原始资料落盘结构：

```text
data/
  incoming/
    math/
    signal-system/
  normalized/
    subjects.json
    chapters.json
    knowledge-points.json
    type-groups.json
    source-documents.json
    questions.json
    solutions.json
    assets.json
  assets/
    source-documents/
    question-images/
    solution-images/
```

### 3.1 incoming
- 放未经清洗的原始文件
- 不允许模型直接覆盖原件

### 3.2 normalized
- 放标准化后的结构数据
- 所有字段必须遵守本规范

### 3.3 assets
- 放拆页图片、裁切题图、答案图、公式图

---

## 4. 命名规则

所有主键统一用 **稳定字符串 ID**，不要用标题当主键。

### 4.1 Subject ID
- `math`
- `signal-system`

### 4.2 Chapter ID
- `{subject}-{slug}`
- 例：
  - `math-advanced-math`
  - `signal-system-convolution`

### 4.3 Knowledge Point ID
- `{chapter-id}-{slug}`

### 4.4 Type Group ID
- `{subject}-{slug}`

### 4.5 Source Document ID
- `{subject}-{source-kind}-{year?}-{org?}-{version?}`
- 例：
  - `math-real-2024-tsinghua`
  - `signal-system-workbook-liangqi-v3`

### 4.6 Question ID
- 推荐：
- `{source-document-id}-q{question-no}`
- 若无题号则：
- `{source-document-id}-{hash8}`

---

## 5. SourceDocument 规则

每份原始资料至少要有：

```ts
type SourceDocument = {
  id: string;
  subjectId: string;
  title: string;
  shortTitle?: string;
  sourceKind: "real_exam" | "workbook" | "mock_exam" | "textbook" | "lecture_note" | "other";
  organization?: string;
  year?: number;
  edition?: string;
  language?: "zh-CN" | "en";
  fileFormat: "pdf" | "docx" | "image" | "markdown" | "html" | "other";
  originalPath: string;
  pageCount?: number;
  tags: string[];
  status: "raw" | "ocr_done" | "parsed" | "reviewed";
  createdAt: string;
  updatedAt: string;
};
```

### 必填原则
- `id`
- `subjectId`
- `title`
- `sourceKind`
- `fileFormat`
- `originalPath`
- `status`

---

## 6. Question 主表规则

每道题必须有一条主记录：

```ts
type Question = {
  id: string;
  subjectId: string;
  chapterIds: string[];
  knowledgePointIds: string[];
  typeGroupIds: string[];
  sourceDocumentId: string;
  sourceQuestionNo?: string;
  title: string;
  stem: string;
  stemLatex?: string;
  questionType: "choice" | "multiple_choice" | "blank" | "calculation" | "proof" | "analysis" | "other";
  difficulty: "basic" | "medium" | "hard";
  yearLabel?: string;
  sourceLabel: string;
  promptSummary?: string;
  answer?: string;
  answerLatex?: string;
  pageStart?: number;
  pageEnd?: number;
  originConfidence: number;
  reviewStatus: "ai_draft" | "review_pending" | "reviewed" | "published";
  duplicateGroupKey?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 6.1 必填字段
- `id`
- `subjectId`
- `sourceDocumentId`
- `title`
- `stem`
- `questionType`
- `difficulty`
- `sourceLabel`
- `originConfidence`
- `reviewStatus`

### 6.2 字段要求
- `title`：前端列表展示标题，允许 AI 概括，但不能丢原题核心语义
- `stem`：尽量保留原题完整文本
- `stemLatex`：仅在需要时保存结构化公式
- `originConfidence`：AI 抽取置信度，范围 `0 ~ 1`
- `reviewStatus`：AI 初稿不得直接标为 `published`

---

## 7. Solution 规则

解析必须独立于 Question，便于多版本共存：

```ts
type Solution = {
  id: string;
  questionId: string;
  version: number;
  source: "ai" | "human" | "teacher" | "imported";
  summary: string;
  steps: string[];
  finalAnswer?: string;
  notes?: string[];
  qualityScore?: number;
  reviewStatus: "draft" | "reviewed" | "published";
  createdAt: string;
  updatedAt: string;
};
```

### 规则
- `summary` 用于前端“解题抓手”
- `steps` 每一步只表达一个动作
- AI 生成的解析默认 `draft`

---

## 8. KnowledgePoint / TypeGroup 规则

### 8.1 KnowledgePoint

```ts
type KnowledgePoint = {
  id: string;
  subjectId: string;
  chapterId: string;
  name: string;
  aliases?: string[];
  summary?: string;
  parentId?: string;
  order: number;
  tags: string[];
};
```

### 8.2 TypeGroup

```ts
type TypeGroup = {
  id: string;
  subjectId: string;
  name: string;
  summary?: string;
  difficultyHint?: "basic" | "medium" | "hard";
  tags: string[];
};
```

### 规则
- `KnowledgePoint` 负责知识结构
- `TypeGroup` 负责题型组织
- 二者不能混用

---

## 9. AI 导入规则

后续你把文档交给 AI 处理时，必须遵守以下流程：

### 第 1 步：文档注册
- 先创建 `SourceDocument`
- 没有 `sourceDocumentId` 不允许生成题目

### 第 2 步：页级切分
- PDF/扫描件优先拆页
- 每页保留页码与图片路径

### 第 3 步：题目抽取
- 识别题号、题干、选项、答案区、解析区
- 无法确定边界时，宁可拆细，不可乱合并

### 第 4 步：知识点映射
- AI 先给候选知识点
- 若无法稳定匹配已有知识点，标记为 `review_pending`

### 第 5 步：题型映射
- 题型必须从受控词表中选择
- 不允许任意生成大量近义新题型

### 第 6 步：去重
- 依据以下信息联合判断：
  - 题干标准化文本
  - 公式标准化文本
  - 题号 + 来源
  - 图像指纹（可选）

### 第 7 步：审核
- AI 输出默认：
  - `reviewStatus = ai_draft` 或 `review_pending`
- 人工审核后再进入 `reviewed / published`

---

## 10. 去重规则

一道题可能出现在：
- 真题
- 习题册
- 模拟卷
- 老师整理版

因此要分清：

### 10.1 Question 主实体
- 表示“这道题的一个标准化版本”

### 10.2 Source 引用
- 表示“这道题出现在哪些资料里”

推荐后续增加关联表：

```ts
type QuestionOccurrence = {
  id: string;
  questionId: string;
  sourceDocumentId: string;
  pageStart?: number;
  pageEnd?: number;
  sourceQuestionNo?: string;
  rawStemSnippet?: string;
};
```

这样就能支持“一题多源”。

---

## 11. 公式、图片、表格规则

### 11.1 公式
- 原始文本保留在 `stem`
- 结构化公式可放 `stemLatex`
- 不强制每条题都做 LaTeX，先保证可读
- 若前端直接消费题目文本，推荐额外提供：
  - `stemMarkdown`
  - `solutionMarkdown`
  便于前端使用 Markdown + KaTeX 渲染链路

#### 前端兼容建议

当前前端已经支持：

- 行内公式：`$...$`
- 块公式：`$$...$$`
- 列表 + 公式混排

因此后续 AI 导入时，若公式能稳定表达，优先输出为 **Markdown + LaTeX 混合文本**，而不是只给纯自然语言概述。

### 11.2 图片
- 题图、答案图、页图分开存
- 图片必须关联：
  - `questionId`
  - `sourceDocumentId`
  - `page`
- 若题目依赖原图理解，建议增加：
  - `assetRole: "stem_figure" | "solution_figure" | "page_snapshot"`
  - `displayOrder`

### 11.3 表格
- 能转 Markdown 表格就转
- 不稳定时保留图片并附文字摘要

### 11.4 原文定位

后续导入教材、白皮书、试卷时，建议 Question 或 QuestionOccurrence 额外保留：

```ts
type SourceLocator = {
  pageStart: number;
  pageEnd?: number;
  figureRefs?: string[];
  rawSnippet?: string;
};
```

这样前端后续可以做：

- 原题回看
- 跳转原页
- 题图/答案图联动

---

## 12. 受控词表建议

### 12.1 sourceKind
- `real_exam`
- `workbook`
- `mock_exam`
- `textbook`
- `lecture_note`
- `other`

### 12.2 questionType
- `choice`
- `multiple_choice`
- `blank`
- `calculation`
- `proof`
- `analysis`
- `other`

### 12.3 difficulty
- `basic`
- `medium`
- `hard`

### 12.4 reviewStatus
- `ai_draft`
- `review_pending`
- `reviewed`
- `published`

---

## 13. AI 输出 JSON 规范

后续让模型产出时，统一要求：

1. 只输出合法 JSON
2. 不得省略必填字段
3. 不能臆造不存在的年份 / 学校 / 题号
4. 不确定内容必须：
   - 填 `null`
   - 或降低 `originConfidence`
5. 长文本字段保留换行，不要压成一行

### 推荐抽取输出格式

```json
{
  "sourceDocument": {},
  "questions": [],
  "solutions": [],
  "assets": [],
  "warnings": []
}
```

---

## 14. 前后端约束

为了适配当前前端，后端最终至少要能投影出：

```ts
type FrontendQuestionProjection = {
  id: string;
  title: string;
  year: string;
  source: string;
  knowledgePoint: string;
  prompt: string;
  note: string;
  strategy: string[];
  mastery?: "mastered" | "blurred" | "unknown";
};
```

### 14.1 当前前端补充要求

当前前端实际已经依赖：

- `prompt` 支持 Markdown / LaTeX
- `note` 支持 Markdown / LaTeX
- `strategy[]` 中的每一条也允许包含公式

因此后端投影建议升级为：

```ts
type FrontendQuestionProjectionV2 = {
  id: string;
  title: string;
  year: string;
  source: string;
  knowledgePoint: string;
  prompt: string;      // markdown + latex
  note: string;        // markdown + latex
  strategy: string[];  // markdown + latex
  mastery?: "mastered" | "blurred" | "unknown";
  sourcePageStart?: number;
  sourcePageEnd?: number;
};
```

以及：

- subject
- chapter
- knowledge node
- type group
- question list

即：后端可以更复杂，但必须能稳定映射到前端当前结构。

---

## 15. 最重要的三条硬规则

### 规则 A：没有来源，不入库
- 每道题必须能追溯到 `SourceDocument`

### 规则 B：AI 初稿不直接发布
- 所有 AI 解析 / 知识点映射 / 题型映射都需要审核状态

### 规则 C：知识点与题型分离
- 知识点 = 学什么
- 题型 = 怎么考
- 不允许混成一个字段

---

## 16. 建议的下一步

下一阶段建议直接落地 3 份文件：

1. `docs/question-bank-data-rules.md`（本文件）
2. `src/types/question-bank.ts`（正式 TypeScript 契约）
3. `data/normalized/*.json` 示例数据

如果继续开发，建议优先补：
- 题库正式 TS 类型
- AI 导入 JSON schema
- 去重策略
- 文档处理流水线
- 前端 projection adapter
- 原题页图 / 题图资源挂载规范
