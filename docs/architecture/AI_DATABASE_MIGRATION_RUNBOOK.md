# AI 数据库 Migration 运维手册

适用范围：`catnote_ai_dev` / `catnote_ai_test` / `catnote_ai_prod`（MySQL 8.4）。
本手册只覆盖 AI 数据库；`catnote_prod` 任何对象都不在本流程内。

固定规则（来自 AGENTS.md 与 ADR-0003）：

- 生产部署只使用 `prisma migrate deploy` 应用**已提交、已审查**的 Migration SQL；
- 禁止 `prisma db push` 作为任何共享/生产环境的部署方式；
- 应用启动时不得自动执行 Migration；
- 生产 Migration 必须先备份、可回滚、执行后做健康检查和数据核对。

## 1. 准备

```bash
npm ci
# AI_DATABASE_URL 指向目标库；生产环境从密钥管理注入，不写入仓库
export AI_DATABASE_URL="mysql://bangcat_ai_app:<password>@<host>:3306/catnote_ai_prod"
npx prisma migrate status
```

`migrate status` 必须显示已有 Migration 均已应用或明确列出待应用项；出现 `failed` 状态时停止，按第 6 节处理。

## 2. 备份（执行前必须完成）

```bash
# 逻辑备份：结构与数据，含事件/触发器定义
mysqldump -h <host> -u <backup-user> -p \
  --single-transaction --routines --triggers --set-gtid-purged=OFF \
  --databases catnote_ai_prod \
  --result-file=backup-catnote_ai_prod-$(date +%Y%m%d-%H%M%S).sql

# 备份后立即验证文件非空且包含建表语句
grep -c "CREATE TABLE" backup-catnote_ai_prod-*.sql
```

首次 Migration 之前数据库为空，备份仍必须执行（证明流程可用，并作为回滚基线）。

## 3. 执行 Migration

```bash
# 审查待执行的 SQL（与 PR 中审查过的文件一致）
cat prisma/ai/migrations/<timestamp>_<name>/migration.sql

npx prisma migrate deploy
npx prisma migrate status
```

期望输出：`All migrations have been successfully applied.` 且 status 为 `Database schema is up to date!`。

## 4. 健康检查

```bash
# 1) 表数量与核心表存在（首次 Migration 应为 14 张业务表 + _prisma_migrations）
mysql -h <host> -u bangcat_ai_app -p catnote_ai_prod -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='catnote_ai_prod';"

# 2) 字符集/排序规则（所有表应为 utf8mb4 / utf8mb4_unicode_ci）
mysql -h <host> -u bangcat_ai_app -p catnote_ai_prod -e \
  "SELECT table_name, table_collation FROM information_schema.tables
   WHERE table_schema='catnote_ai_prod' AND table_collation != 'utf8mb4_unicode_ci';"

# 3) 租户列覆盖（14 张业务表都应有 tenant_id）
mysql -h <host> -u bangcat_ai_app -p catnote_ai_prod -e \
  "SELECT COUNT(DISTINCT table_name) FROM information_schema.columns
   WHERE table_schema='catnote_ai_prod' AND column_name='tenant_id';"

# 4) Schema 与 Migration 零漂移（输出应为空 migration）
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/ai/schema.prisma \
  --script --exit-code
```

## 5. 数据核对

升级场景（库内已有数据）执行后：

```bash
# 与备份时的行数比对（逐表）
mysql -h <host> -u bangcat_ai_app -p catnote_ai_prod -e \
  "SELECT table_name, table_rows FROM information_schema.tables
   WHERE table_schema='catnote_ai_prod' ORDER BY table_name;"

# 抽验中文与 JSON 内容完整
mysql -h <host> -u bangcat_ai_app -p catnote_ai_prod -e \
  "SELECT id, name, JSON_VALID(sanitized_json) FROM cat_assets LIMIT 5;" 2>/dev/null || true
```

应用层核对：启动 API 后调用 `GET /health`，并用 Prisma Client 做一次读写冒烟（新增再删除一条 `audit_logs` 记录）。

## 6. 回滚

Prisma Migration 不自动生成 down migration。回滚策略按场景选择：

**场景 A：Migration 尚未执行** — 无需回滚，不部署即可。

**场景 B：首次（init）Migration 已执行，需完全回退**：

```bash
# 1) 停止 API 与 Worker
docker compose stop bangcat-ai-api bangcat-ai-worker

# 2) 恢复备份
mysql -h <host> -u <backup-user> -p < backup-catnote_ai_prod-<timestamp>.sql

# 或全新环境直接 drop（仅限 init 且确认无数据）
mysql -h <host> -u root -p -e "DROP DATABASE catnote_ai_prod; CREATE DATABASE catnote_ai_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3) 回退应用版本后重启
docker compose up -d bangcat-ai-api bangcat-ai-worker
```

**场景 C：后续 Migration 失败中途退出**（`migrate status` 显示 failed）：

```bash
# 1) 恢复备份
mysql -h <host> -u <backup-user> -p < backup-catnote_ai_prod-<timestamp>.sql

# 2) 清理失败记录后重新评估（不要在生产直接 resolve --applied 跳过审查）
npx prisma migrate resolve --rolled-back "<timestamp>_<name>"
```

**场景 D：已执行但需要撤销已提交的变更** — 创建一个新的**反向 Migration**（DROP/ALTER 逆操作），走正常审查与部署流程；不要手工改库不留痕。

## 7. 本地与 CI 验证

```bash
# 本地：需要可达的 MySQL 兼容实例
export AI_DATABASE_URL="mysql://bangcat_ai_test:test-password@127.0.0.1:3306/catnote_ai_test"
npm run test:migration    # 空库 + 升级场景集成测试（12 项）

# CI：migration-safety job 自动执行
#  - 检查已提交 Migration 存在
#  - 在 scratch MySQL 8.4 上 migrate deploy
#  - migrate diff --exit-code 检测 schema 与 Migration 漂移
#  - 运行 tests/migration 集成测试
```

## 8. 已验证记录（首次 Migration，2026-07-22）

- 空库执行：通过（`tests/migration/initial-migration.spec.ts`，7 项）
- 升级场景：通过（`tests/migration/upgrade-path.spec.ts`，5 项，含预存 T0 数据零丢失、二次 deploy 幂等）
- Prisma Client 读写（中文 + JSON + DATETIME(3) 毫秒精度）：通过
- 租户唯一约束与索引覆盖：通过（information_schema 断言）
- 本地验证环境：MariaDB 11.4（与 CI 的 MySQL 8.4 同为 MySQL 协议兼容；CI 以 MySQL 8.4 为准）
