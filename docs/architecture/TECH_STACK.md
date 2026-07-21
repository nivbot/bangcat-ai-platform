# Bangcat AI Platform 技术栈基线

- 决策日期：2026-07-22
- 状态：已确认，作为新平台生产架构基线
- 原则：稳定优先、类型安全、模块化单体、API 与 Worker 分离、与旧平台低风险集成

## 1. 最终技术栈

| 层级 | 选型 | 作用 |
| --- | --- | --- |
| 运行时 | Node.js 24 LTS | 长期支持的生产运行时 |
| 语言 | TypeScript 5.9 | 领域、接口、数据库和任务参数强类型 |
| 应用框架 | NestJS 11 | 模块边界、依赖注入、Guard、Pipe、Interceptor |
| HTTP 引擎 | Fastify 5 | API 服务、Schema 校验和高性能序列化 |
| 主数据库 | MySQL 8.4 LTS | AI 资产、选题、任务、审核、审计和表现数据 |
| AI 数据库 | `catnote_ai_prod` | 与旧业务库分离，AI 服务可读写 |
| 来源数据库 | `catnote_prod` | 只允许通过专用只读账号访问批准的 View |
| ORM | Prisma ORM 7 | 类型安全查询、Schema 和显式 Migration |
| 异步队列 | BullMQ 5 | 长耗时 AI、图片、视频和媒体处理任务 |
| 队列存储 | Redis 7.4 | Job 状态、重试、延迟和并发控制 |
| 对象存储 | 腾讯云 COS | 原图、生成图、视频、中间产物和导出包 |
| 可观测性 | OpenTelemetry | API、队列、Worker 和模型调用链路追踪 |
| 测试 | Vitest | 领域单测、Service 测试和 API 集成测试 |
| 部署 | Docker Compose | API、Worker、Redis 独立进程和容器 |
| 网关 | 现有 Nginx / `catnoteapi_v2` | AI 服务不直接暴露给小程序和浏览器 |
| CI | GitHub Actions | 类型检查、测试、构建和 Migration 验证 |

## 2. 架构形态

采用“模块化单体 + 独立 Worker”，不是全面微服务。

```text
catnote_client / catnote_admin / superweb
                    │
                    ▼
             catnoteapi_v2
       登录、权限、支付、业务代理
                    │ internal token
                    ▼
          bangcat-ai-api (NestJS)
              │              │
              │              ▼
              │        Redis + BullMQ
              │              │
              │              ▼
              │       bangcat-ai-worker
              │
       ┌──────┼───────────┐
       ▼      ▼           ▼
catnote_ai  catnote_prod  腾讯云 COS
 MySQL RW    Views RO     Generated assets
```

API 与 Worker 共享代码仓库、领域模型、Prisma Client、任务协议和配置，但以不同进程运行。API 进程只创建任务，Worker 进程才加载 Queue Processor。

## 3. 数据库隔离

同一个 MySQL 实例中使用不同数据库：

```text
catnote_prod       旧平台生产业务库
catnote_ai_prod    AI 平台生产库
catnote_test       旧平台测试库
catnote_ai_test    AI 平台测试库
```

使用两个数据库账号：

1. `bangcat_ai_app`：只对 `catnote_ai_prod.*` 有读写权限；
2. `bangcat_ai_source_reader`：只对 `catnote_prod.ai_public_*` Views 有 `SELECT` 权限。

禁止：

- AI 账号写入 `catnote_prod`；
- AI 服务直接读取 `user`、`apply`、身份证、手机号和微信号等隐私字段；
- 在两个数据库之间创建跨库外键；
- 应用启动时自动修改生产表结构。

## 4. 服务边界

旧平台负责：

- 用户、登录和权限；
- 小程序与管理端；
- 猫咪原始业务资料；
- 站点、订单、支付、门禁、直播和设备。

AI 平台负责：

- 脱敏猫咪数字资产；
- 趋势、参考案例和传播模式；
- 选题候选、评分和审核；
- 文本、图片和视频生成任务；
- 内容包、版本、成本和模型调用记录；
- 发布准备和表现反馈。

## 5. 鉴权

浏览器和小程序不直接访问 AI 服务。

```text
用户 JWT → catnoteapi_v2 校验角色 → 内部服务令牌 → bangcat-ai-api
```

内部请求至少携带：

```text
x-service-token
x-tenant-id
x-actor-id
x-actor-type
x-request-id
```

AI 平台将操作人和请求 ID 写入审计日志。

## 6. 多租户约束

AI 核心表从第一版开始包含 `tenant_id`。当前默认租户为 `bangcat`，未来可支持不同品牌、项目和合作方。所有数据访问必须包含租户条件，不能只通过前端过滤。

## 7. 文件策略

MySQL 只保存元数据和 `storage_key`，不保存图片或视频二进制。COS 目录建议：

```text
bangcat-ai/source/
bangcat-ai/characters/
bangcat-ai/generated-images/
bangcat-ai/generated-videos/
bangcat-ai/content-packs/
bangcat-ai/thumbnails/
bangcat-ai/exports/
```

## 8. 版本策略

- 运行时固定 Node.js 24 LTS 大版本；
- 依赖使用锁文件并由 CI 验证；
- Prisma 只使用稳定版，不使用 Preview/Early Access 数据库能力；
- 生产 Migration 必须代码审查并使用 `prisma migrate deploy`；
- 不自动追逐每个最新版本，以安全更新和 LTS 为升级依据。
