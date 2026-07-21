# Bangcat AI Platform

“帮猫小本本”的 AI 猫咪数字资产、选题和内容生产平台。

现有 `AIcoding / catnoteapi_v2` 继续负责用户、权限、猫咪业务资料、站点、支付、门禁和直播；本平台负责脱敏资产、选题、异步生成任务、内容审核和表现学习。

## 项目协作入口

任何人或 AI 在修改代码前必须先阅读：

1. [AGENTS.md](AGENTS.md) — 强制 Agent 协作契约；
2. [项目当前状态](docs/project/PROJECT_STATUS.md)；
3. [产品与技术路线图](docs/project/ROADMAP.md)；
4. [项目组运作模型](docs/project/OPERATING_MODEL.md)；
5. [Review 与合并门禁](docs/project/REVIEW_AND_MERGE.md)；
6. [技术栈基线](docs/architecture/TECH_STACK.md) 与相关 ADR。

所有开发采用 Issue → 短期分支 → PR → 独立审查 → 验证 → 合并 → 清理分支的流程。禁止直接向 `main` 提交。

## 已确认技术栈

- Node.js 24 LTS + TypeScript 5.9
- NestJS 11 + Fastify 5
- Prisma ORM 7 + MySQL 8.4 LTS
- Redis 7.4 + BullMQ 5
- 腾讯云 COS
- OpenTelemetry
- Vitest
- Docker Compose + GitHub Actions

完整决策：

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

## 数据库边界

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

AI 服务不得拥有旧业务库写权限，不得直接读取手机号、微信号、身份证和领养申请等隐私字段，不得建立跨库外键。

## 运行进程

```text
bangcat-ai-api       HTTP API，默认 3010
bangcat-ai-worker    BullMQ Worker，不开放 HTTP
```

API 只验证请求、保存状态和入队；长耗时模型与媒体任务只由 Worker 执行。

## 本地启动

要求 Node.js 24、MySQL 和 Redis。

```bash
cp .env.example .env
npm ci
npm run prisma:migrate:dev -- --name init_mysql
npm run prisma:generate
npm run dev
```

另一个终端启动 Worker：

```bash
npm run dev:worker
```

完整检查：

```bash
npm run check
```

健康检查：

```bash
curl http://127.0.0.1:3010/health
```

内部 API 请求需要：

```text
x-service-token: <INTERNAL_SERVICE_TOKEN>
x-tenant-id: bangcat
x-actor-id: <current-user-id>
x-actor-type: admin
x-request-id: <request-id>
```

## Docker

```bash
docker network create catnote-shared-network
docker compose up -d --build
```

正式环境中，AI API 不直接暴露给浏览器或小程序，由现有 `catnoteapi_v2` 代理调用。

## Topic Engine T0 API

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

选题引擎保留趋势、猫咪匹配、人类兴趣、新颖度和平台适配正向评分，以及相似度、版权、事实和题材疲劳风险扣分。高风险候选会被硬阻断；候选编辑后旧评分失效；所有写入记录 tenant、actor 和 request ID。

## 当前状态

已完成生产技术栈、MySQL Prisma Schema、来源库只读 View Schema、NestJS/Fastify API、Topic Engine Prisma 纵向切片、BullMQ Worker 骨架、COS Adapter、OpenTelemetry 入口、Docker 和 CI。

下一阶段先完成依赖锁与 `npm ci`、旧平台只读接入和第一份可回滚 MySQL Migration，再进入 Topic Engine T1 模型拆解。详见 [PROJECT_STATUS](docs/project/PROJECT_STATUS.md)。

## 关键原则

- 先选题，后写作；
- 先抽象传播模式，后原创生成；
- 真实事实、改编和虚构明确区分；
- 不保存或复刻第三方完整作品；
- 所有模型调用、任务和结果可追溯；
- API 与 Worker 分离，但暂不拆成大量微服务；
- 生产 Migration 显式执行、审查并可回滚。
