# 从 Bootstrap 架构迁移到生产架构

## 当前迁移状态

本分支完成生产架构基础和 Topic Engine 的 Prisma/NestJS 纵向切片。原 SQLite 代码保留在历史提交中用于对照，不再作为默认启动入口。

## 阶段 M1：基础设施切换

- [x] Node.js 24 LTS；
- [x] NestJS + Fastify API；
- [x] Prisma 7 MySQL Schema；
- [x] AI 数据库与来源数据库双连接；
- [x] Redis + BullMQ；
- [x] API/Worker 双进程；
- [x] COS Storage Port；
- [x] OpenTelemetry 可选启动；
- [x] Docker Compose；
- [x] GitHub Actions；
- [x] 内部服务令牌与操作人审计头；
- [x] Topic Engine T0 NestJS Controller 与 Prisma Service。

## 阶段 M2：旧平台接入

- [ ] 在 `catnote_prod` 创建 `ai_public_cats`；
- [ ] 创建 `ai_public_cat_events`；
- [ ] 创建 `ai_public_media`；
- [ ] 创建 `ai_public_stations`；
- [ ] 创建 `bangcat_ai_source_reader` 只读账号；
- [ ] 在 `catnoteapi_v2` 增加 AI 内部代理模块；
- [ ] 复用 JWT 权限，将 actor、tenant 和 request ID 传给 AI 服务；
- [ ] 为管理端增加选题引擎页面。

## 阶段 M3：数据迁移

T0 尚未进入正式生产，因此优先重新导入测试数据，不建议把 SQLite 文件作为长期数据源。确实需要迁移时：

1. 冻结 SQLite 写入；
2. 导出 JSON；
3. 校验租户、状态、时间和关系；
4. 写入 `catnote_ai_*`；
5. 比对记录数和 Hash；
6. SQLite 归档只读，不再启动。

## 阶段 M4：异步生成

- [ ] Reference Analysis Worker；
- [ ] Topic Generation Worker；
- [ ] 文本内容包 Worker；
- [ ] 图片生成 Worker；
- [ ] 视频生成与转码 Worker；
- [ ] 模型调用、Token、费用和 Prompt 版本表；
- [ ] 任务取消、重试和人工恢复。

## 上线前门槛

- MySQL Migration 在测试库和空库均通过；
- API 与 Worker 能独立启动；
- AI 账号无法写入 `catnote_prod`；
- 未配置 COS 时不会静默丢失文件；
- Redis 中断后任务可恢复；
- 所有写 API 有 actor、tenant 和 request ID；
- CI 全绿；
- 完成备份和回滚演练。
