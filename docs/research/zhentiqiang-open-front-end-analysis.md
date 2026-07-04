# 真题墙公开前端分析（公开表面）

> 时间：2026-04-20  
> 范围：仅记录公开可见的页面、静态资源与公开接口行为。

## 1. 已确认的公开资源

目标页面：

- `https://zhentiqiang.com/kaoyan/math`

可直接获取的主要前端资源：

- 页面 HTML
- `static/js/index.js`
- `static/js/login.js`
- `static/css/index.css`
- 多个 `/api/...` 公开接口

## 2. 观察到的前端模块

从公开页面与前端脚本可观察到，目标站点大致包含以下模块：

1. 试卷组切换（数学一 / 二 / 三）
2. 年份试卷列表
3. 题目卡片 / 题目详情
4. 知识点树与知识点筛选
5. 情绪/掌握度标记（熟练 / 不熟 / 不会）
6. 题目统计与难度展示
7. 解析、解析图片、视频讲解
8. 评论区与回复
9. 登录、会员、营销/优惠码相关入口

## 3. 公开接口表面（已验证示例）

### 基础装载

- `/api/bootstrap`
- `/api/papers/{groupId}`
- `/api/knowledge_tree/{groupId}`

### 题目与题图

- `/api/question_info/{questionId}`
- `/api/questions/batch`
- 题图 URL 形如：`/static/photos/group_8/paper_42/1.png`

### 统计与社交

- `/api/papergroup_stats/{groupId}`
- `/api/question_stats/{questionId}`
- `/api/comments/{questionId}`
- `/api/videos/{questionId}`

### 登录后相关（仅观察到接口形态，不进行绕过）

- `/api/check_login`
- `/api/user_selection/{questionId}`
- `/api/user_collection/...`
- `/api/student_interaction`
- 会员 / 营销相关接口

## 4. 对我们自己的产品意味着什么

### 可以抽象出来的产品能力

- 试卷组 → 试卷 → 题目 的三级浏览结构
- 题目资源聚合（答案、解析、视频、评论）
- 知识点树与题目映射
- 题目状态标记与统计反馈
- 社区互动与资源补充机制

### 不应直接照搬的部分

- 原始前端代码
- 原字段命名
- 原 UI 布局与视觉设计
- 原会员/营销话术

## 5. clean-room 落地方式

我们的做法：

1. 用脚本保存公开快照，供分析使用
2. 在 `docs/research/` 记录模块和接口表面
3. 在 `src/types/` 定义自己的领域模型
4. 在 `src/components/` 和 `src/hooks/` 中做原创实现

## 6. 相关文件

- `scripts/fetch-target-site-snapshot.mjs`
- `docs/architecture/frontend-foundation.md`
- `src/types/study-wall.ts`
- `src/lib/mock-study-wall.ts`
