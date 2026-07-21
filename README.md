# Bangcat AI Platform

“帮猫小本本”的 AI 猫咪数字资产、选题和内容生产平台。

本仓库采用生产级现代架构，并与现有 `AIcoding / catnoteapi_v2` 平台保持清晰边界：旧平台继续负责用户、权限、猫咪业务资料、站点、支付、门禁和直播；AI 平台负责脱敏资产、选题、生成任务、内容审核和表现学习。

## 已确认技术栈

- Node.js 24 LTS
- TypeScript 5.9
- NestJS 11 + Fastify 5
- Prisma ORM 7 + MySQL 8.4 LTS
- Redis 7.4 + BullMQ 5
- 腾讯云 COS
- OpenTelemetry
- Vitest
- Docker Compose + GitHub Actions

完整决策见：

- [技术栈基线](docs/architecture/TECH_STACK.md)
- [ADR-0003：生产级 AI 平台技术栈](docs/architecture/ADR-0003-production-platform-stack.md)
- [Bootstrap 迁移计划](docs/architecture/MIGRATION_FROM_BOOTSTRAP.md)

## 系统关系

```text
小程序 / 管理端 / PC 超管
             │
             ▼
      现有 catnoteapi_v2
    JWT、角色与业务接口代理
             │ internal service token
             ▼
       bangcat-ai-api
          │       │
          │       ▼
          │ Redis + BullMQ
          │       │
          │       ▼
          │ bangcat-ai-worker
          │
   ┌──────┼────────────┐
   ▼      ▼            ▼
AI MySQL 旧库只读Views 腾讯云COS
```

## 数据库原则

同一 MySQL 实例，不同数据库：

```text
catnote_prod       现有业务生产库
catnote_ai_prod    AI 平台生产库
catnote_test       现有业务测试库
catnote_ai_test    AI 平台测试库
```

必须使用两个账号：

- AI 应用账号：只读写 `catnote_ai_*`；
- 来源账号：只读 `catnote_*` 中批准的 `ai_public_*` Views。

AI 服务不得拥有旧业务库写权限，不得直接读取手机号、微信号、身份证和领养申请等隐私字段。

## 运行进程

本仓库产生两个进程：

```text
bangcat-ai-api       HTTP API，默认 3010
bangcat-ai-worker    BullMQ Worker，不开放 HTTP
```

二者共享领域逻辑、Prisma Client、任务协议和配置，但可以独立扩容和重启。

## 本地启动

要求 Node.js 24、MySQL 和 Redis。

```bash
cp .env.example .env
npm install
npm run prisma:migrate:dev -- --name init_mysql
npm run prisma:generate
npm run dev
```

另一个终端启动 Worker：

```bash
npm run dev:worker
```

健康检查：

```bash
curl http://127.0.0.1:3010/health
```

内部 API 需要：

```text
x-service-token: <INTERNAL_SERVICE_TOKEN>
x-tenant-id: bangcat
x-actor-id: <current-user-id>
x-actor-type: admin
x-request-id: <request-id>
```

## Docker

先创建与现有平台共享的内部网络：

```bash
docker network create catnote-shared-network
```

然后：

```bash
docker compose up -d --build
```

正式环境中，AI API 不应直接暴露给浏览器或小程序。应由现有 `catnoteapi_v2` 代理调用。

## Topic Engine T0

现代化后的 API 保留 T0 主流程：

```text
GET|POST  /v1/topic/trends
PUT       /v1/topic/trends/:id
GET|POST  /v1/topic/references
PUT       /v1/topic/references/:id
GET|POST  /v1/topic/patterns
PUT       /v1/topic/patterns/:id
GET|POST  /v1/topic/opportunities
PUT       /v1/topic/opportunities/:id
GET|POST  /v1/topic/candidates
GET|PUT   /v1/topic/candidates/:id
POST      /v1/topic/candidates/:id/score
POST      /v1/topic/candidates/:id/status
POST      /v1/jobs/reference-analysis
```

选题领域算法继续保持：

- 趋势、猫咪匹配、人类兴趣、新颖度和平台适配正向评分；
- 相似度、版权、事实和题材疲劳风险扣分；
- 高相似度、高版权风险和高事实风险硬阻断；
- 候选必须引用事实、传播模式和可用素材；
- 候选编辑后清空旧评分；
- 每次写入与评分记录 tenant、actor 和 request ID。

## 当前边界

已完成：

- 生产技术栈脚手架；
- MySQL Prisma Schema；
- 旧库只读 View Schema；
- NestJS/Fastify API；
- Topic Engine Prisma 纵向切片；
- BullMQ 队列与 Worker 骨架；
- COS Storage Adapter；
- OpenTelemetry 可选接入；
- Docker Compose 和 CI。

尚未完成：

- 在旧业务库实际创建 `ai_public_*` Views；
- 在 `catnoteapi_v2` 增加 AI 代理接口；
- 正式配置 MySQL、Redis、COS 和 OTLP；
- Topic Engine T1 的模型拆解；
- 图片和视频生成 Worker；
- 自动发布。

## 关键原则

- 先选题，后写作；
- 先抽象传播模式，后原创生成；
- 真实事实、改编和虚构必须明确区分；
- 不保存或复刻第三方完整作品；
- 所有模型调用、任务和生成结果可追溯；
- API 与 Worker 分离，但暂不拆成大量微服务；
- 生产 Migration 必须显式执行并可回滚。
