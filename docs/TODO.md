# Study Wiki Wall TODO

> 更新时间：2026-04-26

## P0 当前必须补齐

- 为本地持久化状态增加 `schema version` 和迁移逻辑
- 为题库条目补齐稳定元数据：
  - `sourceDocument`
  - `sourcePage`
  - `assetRefs`
  - `importBatchId`
- 把 `mock-study-wall.ts` 继续拆成“正式题库层”和“前端展示投影层”

## P1 前端产品闭环

- 首页统计卡切到正式状态源，而不是只靠当前前端聚合
- 支持题图、答案图、来源页码、原文档跳转
- 支持错题本 / 收藏本筛选与搜索
- 支持每题学习笔记、视频、纠错入口的真实落地
- 思维导图页补“定位到当前题 / 居中到节点 / 返回上一视角”

## P1 后端与数据

- 新建 `question-bank` 领域模型与 adapter
- 建立 `subjects / chapters / knowledge_points / type_groups / questions / solutions / assets` 数据表
- 为用户状态建立 `user_question_state` 表
- 为 AI 导入建立 `source_documents / import_jobs / review_queue` 流程
- 支持题目去重、题源追踪、审核状态流转

## P2 管理后台

- 题库录入与纠错后台
- AI 导入审核页
- 题目去重与合并工具
- 资源上传与资产管理
- 学习统计与内容覆盖率看板

## P2 托管与运维

- 确定 Cloudflare 托管方案
- 接入生产环境变量管理
- 接入基础错误监控与访问日志
- 为静态资源与题图建立对象存储与缓存策略
- 增加预发环境和正式环境

## 今日已完成

- 本地持久化已接通 `掌握 / 错题 / 收藏 / 最近一次掌握记录`
- 信号与系统题库已切到郑君里做题本前两章
- 第一章 `1.1` 到 `1.24`、第二章 `2.1` 到 `2.25` 已完成导入
- 本地状态恢复已增加 questionId 白名单清洗
- `signal-system` 题库替换方式已从数组下标覆盖改为按 `subject.id` 替换
- 首页 `继续学习` 已接入真实跳题
- 首页 / 章节工作台搜索已覆盖题干正文与解题抓手
