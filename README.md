# Bangcat AI Platform

“帮猫小本本”的 AI 猫咪内容资产平台。系统把现有小程序里的公开猫咪资料，以只读、脱敏、可审计的方式同步到独立 AI 资产库，为角色卡、图文内容、视频脚本和未来 MCP 创作能力提供基础。

## 当前实现

当前代码完成了 Phase 0，并开始 Phase 1 的最小纵向闭环：

- 独立 AI SQLite 数据库；
- 猫咪公开字段白名单；
- 手机号、邮箱和微信号文本脱敏；
- 非公开媒体过滤与授权范围；
- 源数据哈希和幂等同步；
- 同步批次、公开资产、媒体资产和审计表；
- 猫咪资产查询 API；
- 脱敏预览与测试数据同步接口；
- 单元测试与脱敏 fixture。

当前**没有**连接生产数据库、调用大模型、生成图片/视频或自动发布。

## 快速启动

要求 Node.js 22 或更高版本。

```bash
cp .env.example .env
npm test
npm start
```

默认服务地址：`http://127.0.0.1:3000`

导入仓库内的假数据：

```bash
curl -X POST http://127.0.0.1:3000/v1/sync/fixture \
  -H 'content-type: application/json' \
  --data-binary @tests/fixtures/source-cats.json
```

查询猫咪资产：

```bash
curl http://127.0.0.1:3000/v1/cats
```

生产或共享环境配置 `ADMIN_API_KEY` 后，写接口需要请求头：

```text
x-admin-api-key: <ADMIN_API_KEY>
```

## 文档

- [产品需求文档](docs/PRD.md)
- [Codex 开发计划](docs/CODEX_PLAN.md)
- [系统上下文](docs/architecture/SYSTEM_CONTEXT.md)
- [数据映射与隐私白名单](docs/architecture/DATA_MAPPING.md)
- [ADR-0001：启动技术栈](docs/architecture/ADR-0001-bootstrap-stack.md)

## 关键原则

- AI 系统不得拥有生产数据库写权限；
- 未列入白名单的字段默认排除；
- 真实事实、文学改编和虚构故事必须明确区分；
- 每次同步和生成必须可追溯、可重试、可审计；
- 第一阶段采用自动生成加人工审核，不做自动发布。

## 下一步

1. 确认现有生产库类型、表结构和只读视图；
2. 批准实际字段白名单；
3. 实现生产库只读 Connector；
4. 增加全量、增量和单猫同步命令；
5. 为管理后台提供同步状态和猫咪资产页面；
6. 再进入角色卡和文本模型 Provider。
