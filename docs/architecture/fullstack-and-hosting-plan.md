# Study Wiki Wall 前后端设计与托管方案

> 更新时间：2026-04-25

## 1. 当前结论

现阶段推荐采用：

- 前端主应用：`Next.js App Router`
- API / BFF：优先保持与前端同仓库，后续可拆
- 主数据：关系型题库 + 用户状态表
- 资源存储：题图、答案图、拆页图走对象存储
- 托管方向：优先考虑 Cloudflare 生态

当前项目还处于原型阶段，因此托管方案需要分阶段推进，而不是一步上全套复杂基础设施。

## 2. 前端设计

前端继续保留当前分层：

- `src/app/`：路由与服务端入口
- `src/components/dashboard/`：学习工作台主界面
- `src/hooks/`：页面状态与筛选派生
- `src/types/`：UI 领域模型
- `src/lib/`：mock 数据、adapter、后续 API 映射

前端当前已验证的关键交互：

- 首页工作台和题目工作台分离
- 章节树与题目区域联动
- 题目解析向下展开
- 科目级独立统计
- 错题本 / 收藏本独立视图
- 深浅色主题切换

## 3. 后端设计

后端不要直接复用前端 `study-wall.ts` 作为数据库模型，应该拆成两层：

- `question-bank`：正式数据实体
- `study-wall projection`：前端展示投影

推荐核心实体：

- `subjects`
- `chapters`
- `knowledge_points`
- `type_groups`
- `questions`
- `solutions`
- `assets`
- `source_documents`
- `users`
- `user_question_state`

其中 `user_question_state` 至少要覆盖：

- `userId`
- `questionId`
- `masteryState`
- `isFavorite`
- `isWrongQuestion`
- `lastMasteredAt`
- `updatedAt`

## 4. API 边界

优先采用 BFF 风格接口，让前端拿到直接可渲染的数据：

- `GET /api/subjects`
- `GET /api/subjects/:id/tree`
- `GET /api/subjects/:id/overview`
- `GET /api/questions/:id`
- `GET /api/wrongbook?subjectId=...`
- `GET /api/favorites?subjectId=...`
- `PATCH /api/question-state/:questionId`

这样可以避免前端直接拼装过多原始表数据。

## 5. Cloudflare 托管建议

### 阶段 A：当前原型

目标是尽快上线可访问版本。

推荐：

- Web 应用托管到 Cloudflare 上
- 先不接正式数据库
- 静态资源先随仓库或简单对象存储管理

适用场景：

- 演示
- UI 验证
- 小范围内部试用

### 阶段 B：有用户状态

一旦要保存收藏、错题、掌握记录，就需要正式后端能力。

推荐补齐：

- 用户鉴权
- 题目状态 API
- 关系型数据库
- 对象存储

### 阶段 C：内容规模扩大

当题库、题图和导入任务明显增大后，再补：

- 队列 / 异步导入
- AI 审核流水线
- 后台管理端
- 更完整的缓存与监控

## 6. Cloudflare 资源分工建议

如果继续走 Cloudflare 生态，可按职责拆分：

- 应用入口：Cloudflare 托管的 Web 前端
- API 层：边缘函数或独立服务
- 关系数据：关系型数据库
- 题图/资源：对象存储
- 高频只读缓存：KV 类缓存

原则：

- 题库主数据不要放在只适合简单键值的存储里
- 用户状态和题库检索应优先考虑关系型存储
- 大文件与图片必须和结构化数据分离

## 7. 当前最务实的落地路线

1. 先上线前端原型，验证 UI 和学习流程。
2. 补本地持久化，验证状态模型是否稳定。
3. 再接最小后端：用户状态表 + 题目状态 API。
4. 最后再做题库后台、AI 导入、资产管理。

## 8. 当前风险

- 目前所有学习状态仍是前端内存态
- 题目数据还不是正式题库 schema
- 题图和来源页码还没有进入统一资产体系
- 题目按钮中的视频 / 笔记 / 纠错仍是占位入口
