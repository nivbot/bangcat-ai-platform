# Bangcat AI Platform 项目状态

- 最后更新：2026-07-22
- 主干：`main`
- 当前阶段：生产架构与项目操作系统完成，准备进入旧平台安全接入
- 项目负责人：产品与架构总负责人（与用户共同决策）

## 已完成

### 产品与领域

- 明确 AI 猫咪资产平台定位；
- 完成 Topic Engine 总体设计；
- 完成 Topic Engine Phase T0 人工工作流；
- 建立趋势、参考案例、传播模式、猫咪机会、候选和可解释评分模型；
- 建立相似度、版权和事实风险硬阻断。

### 技术架构

- Node.js 24 LTS + TypeScript；
- NestJS 11 + Fastify 5；
- Prisma 7 + MySQL 8.4 LTS；
- AI 数据库与旧业务来源数据库双连接；
- Redis 7.4 + BullMQ 5；
- API 与 Worker 独立进程；
- 腾讯云 COS Storage Adapter；
- OpenTelemetry 接入入口；
- Docker Compose 与 GitHub Actions；
- `package-lock.json` 已提交，CI 和 Docker 使用 `npm ci`；
- CI 已覆盖仓库政策、Prisma、TypeScript、Vitest 和生产构建。

### 项目操作系统

- 建立 Agent 合作契约、贡献规范和安全政策；
- 建立 Project Lead、Delivery、Review、Verification、Release 角色；
- 建立 Issue、PR、Handoff 和 Review 模板；
- 建立项目状态、路线图、发布门禁和仓库卫生检查；
- 清除旧 SQLite、原生 HTTP 和重复 `node:test` 实现。

### 数据安全边界

- AI 数据写入 `catnote_ai_*`；
- `catnote_prod` 只允许通过批准的 `ai_public_*` View 查询；
- 不允许跨库外键；
- 不允许 AI 服务写旧业务库；
- 小程序和浏览器不直接访问 AI 服务。

## 当前未完成

### P0：旧平台安全接入 M2

- 在旧平台建立 `ai_public_cats`、`ai_public_cat_events`、`ai_public_media`、`ai_public_stations`；
- 创建 `bangcat_ai_source_reader` SELECT-only 账号；
- 在 `catnoteapi_v2` 建立内部 AI 代理；
- 传递 actor、tenant 和 request ID；
- 验证 AI 账号无法写入 `catnote_prod`。

### P0：第一份 MySQL Migration

- [x] 从 Prisma Schema 生成 Migration；
- [x] 审查 SQL（表名、类型、JSON、索引、唯一约束、租户列、时间精度、utf8mb4）；
- [x] 在空库和 `catnote_ai_test` 升级场景验证（`tests/migration`，12 项集成测试）；
- [x] 建立备份、回滚和数据校验流程（[AI_DATABASE_MIGRATION_RUNBOOK](../architecture/AI_DATABASE_MIGRATION_RUNBOOK.md)）；
- [x] CI 增加 migration-safety 验证（scratch MySQL 8.4 deploy + 漂移检测 + 集成测试）。

### P0：依赖与供应链安全

- 建立定期依赖漏洞检查；
- 约定自动升级和人工评审范围；
- 禁止未经解释的新生产依赖。

### P1：Topic Engine T1

- 定义版本化 `ReferenceAnalysis` Schema；
- 实现案例结构化拆解 Worker；
- 只向下游暴露抽象模式，不暴露第三方完整作品；
- 建立 Prompt、模型、Token、费用和结果记录。

## 当前风险

- 生产 MySQL 版本和实际部署资源仍需最终确认；
- 旧平台只读 Views 尚未创建；
- Redis、COS 和 OpenTelemetry 生产配置尚未完成；
- 生产 Migration 尚未建立；
- 管理端尚无 Topic Engine 页面；
- T0 仍需真实运营数据验证评分有效性。

## 下一决策点

在开始 T1 模型开发前，先完成：

1. 旧平台只读接入；
2. AI 数据库第一份可回滚 Migration；
3. 依赖漏洞检查和升级策略。

以上基础通过验收后，再进入模型调用和自动分析开发。
