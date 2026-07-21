# ADR-0003：生产级 AI 平台技术栈

- 状态：Accepted
- 日期：2026-07-22
- 替代：ADR-0001 中仅用于 Bootstrap 的 SQLite、原生 HTTP 和实验性 TypeScript 直跑方案

## 背景

Bootstrap 阶段使用 Node.js 内置 HTTP、`node:sqlite` 和零第三方运行依赖，目的是先验证数据隔离、脱敏和 Topic Engine T0。现有生产平台 `AIcoding` 已确认使用 Node.js、Express、Sequelize、MySQL、JWT、Docker 和 Nginx；生产业务数据库为独立 MySQL 库。

AI 平台后续需要处理长耗时模型调用、大量图片和视频、任务重试、成本追踪、多租户和多进程扩展。SQLite 和同步 HTTP 请求不适合作为正式生产基础。

## 决策

1. 使用 Node.js 24 LTS 和 TypeScript；
2. 使用 NestJS 11 + Fastify 5 构建模块化 API；
3. 使用 Prisma ORM 7 + MySQL 8.4 LTS；
4. 与旧平台共用 MySQL 实例，但使用独立数据库 `catnote_ai_*`；
5. 使用独立只读账号访问旧业务库批准的 `ai_public_*` Views；
6. 使用 Redis + BullMQ 执行 AI 与媒体异步任务；
7. API 与 Worker 作为独立容器运行；
8. 生成资产进入腾讯云 COS；
9. 使用 OpenTelemetry 和结构化日志追踪请求与任务；
10. 旧平台负责用户鉴权，AI 服务只接受内部服务调用；
11. 保持模块化单体，不在产品验证阶段拆成大量微服务。

## 影响

### 正面

- 与现有 MySQL 和 Docker 基础设施兼容；
- AI 数据与交易业务数据物理隔离；
- TypeScript + Prisma 降低 AI 编程时的字段漂移风险；
- 长耗时任务不阻塞 HTTP；
- API 与 Worker 可独立扩容；
- 生成文件不再依赖单机磁盘；
- 模型调用、任务、操作人和成本可追踪。

### 代价

- 引入 Redis、Prisma Migration 和对象存储配置；
- 开发环境需要 MySQL 与 Redis；
- Bootstrap SQLite 数据需要一次性迁移；
- Topic Engine T0 Repository 必须从同步 SQLite API 迁移为异步 Prisma API。

## 明确不采用

- 不把 AI 模块直接塞进 `catnoteapi_v2` 进程；
- 不让小程序直接访问 AI 服务；
- 不让 AI 服务拥有旧业务库写权限；
- 不采用 Kubernetes、Kafka、Service Mesh 或大量微服务；
- 不继续使用 SQLite 作为生产数据库；
- 不使用 Node.js 实验性 TypeScript 直跑作为生产启动方式。
