# Bangcat AI Platform

“帮猫小本本”的 AI 猫咪内容资产与选题创作平台。

系统把现有小程序里的公开猫咪资料，以只读、脱敏、可审计的方式同步到独立 AI 资产库；再通过选题引擎学习趋势和高传播内容的抽象结构，为角色卡、原创图文、视频脚本和未来 MCP 创作能力提供基础。

项目的核心不只是“让 AI 写内容”，而是建立完整闭环：

```text
猫咪数字资产
    +
趋势与爆款模式库
    ↓
选题引擎
    ↓
图文 / 视频内容包
    ↓
原创、事实与授权检查
    ↓
人工审核与发布
    ↓
表现数据回流
```

## 核心产品能力

### 1. AI 猫咪资产库

保存脱敏后的猫咪事实、公开素材、角色卡、故事边界、创作历史和授权信息。

### 2. 选题引擎

决定“现在讲什么、为什么用户会看、应该选择哪只猫、适合哪个平台和内容形式”。

选题引擎参考高传播内容时，只复用钩子功能、叙事节奏、情绪曲线、视觉语法和互动机制，不复制原文、独特表达或连续镜头结构。

### 3. 内容包生成

选题通过后，生成公众号、小红书、抖音和视频号所需的完整内容包，包括标题、卡片结构、正文、分镜、旁白、字幕、素材清单和 AI 资产提示词。

### 4. 审核与反馈

检查事实、隐私、原创性、授权和平台风险；发布后将表现数据关联回选题、模式、猫咪和评分版本。

## 当前实现

当前代码完成了基础数据隔离，并实现 Topic Engine Phase T0：

- 独立 AI SQLite 数据库与顺序迁移；
- 猫咪公开字段白名单、隐私脱敏和幂等同步；
- 趋势信号、参考案例、传播模式与案例关联；
- 猫咪内容机会、选题候选和评分历史；
- 人工创建、编辑、筛选、评分和状态流转 API；
- 可解释选题评分、相似度/版权/事实风险硬阻断；
- 候选编辑后自动清除旧评分，防止过期分数继续生效；
- 所有 Topic Engine 写操作进入审计日志；
- API Key 鉴权和操作人标识；
- 单元测试、HTTP 集成测试与脱敏 fixture。

当前**没有**连接生产数据库、自动采集第三方平台、调用大模型、生成图片/视频或自动发布。

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

生产或共享环境配置 `ADMIN_API_KEY` 后，Topic Engine 与同步写接口需要请求头：

```text
x-admin-api-key: <ADMIN_API_KEY>
x-actor-id: <operator-id>
x-actor-type: user
```

## Topic Engine T0 API

```text
GET|POST  /v1/topic/trends
GET|PUT   /v1/topic/trends/:id
GET|POST  /v1/topic/references
GET|PUT   /v1/topic/references/:id
GET|POST  /v1/topic/patterns
GET|PUT   /v1/topic/patterns/:id
GET|POST  /v1/topic/opportunities
GET|PUT   /v1/topic/opportunities/:id
GET|POST  /v1/topic/candidates
GET|PUT   /v1/topic/candidates/:id
POST      /v1/topic/candidates/:id/score
POST      /v1/topic/candidates/:id/status
```

候选评分请求中的 12 个信号均使用 `0—1` 数值。评分结果保存总分、逐项贡献、风险扣分、硬阻断原因和评分版本。

## 验证状态

新增的 T0 持久化与 HTTP 鉴权流程已在 Node.js 22 隔离环境运行 4 个测试，结果为 4 passed、0 failed。当前执行环境无法解析 `github.com`，因此尚未从远端重新克隆并执行完整分支测试；仓库暂未配置 GitHub Actions。

## 文档

- [产品需求文档](docs/PRD.md)
- [选题引擎技术设计](docs/TOPIC_ENGINE.md)
- [选题引擎实施计划](docs/TOPIC_ENGINE_PLAN.md)
- [Codex 开发计划](docs/CODEX_PLAN.md)
- [系统上下文](docs/architecture/SYSTEM_CONTEXT.md)
- [数据映射与隐私白名单](docs/architecture/DATA_MAPPING.md)
- [ADR-0001：启动技术栈](docs/architecture/ADR-0001-bootstrap-stack.md)
- [ADR-0002：选题引擎优先](docs/architecture/ADR-0002-topic-engine-first.md)

## 关键原则

- AI 系统不得拥有生产数据库写权限；
- 未列入白名单的字段默认排除；
- 先选题，后写作；
- 先抽象传播模式，后原创生成；
- 真实事实、文学改编和虚构故事必须明确区分；
- 不保存或复刻第三方完整作品；
- 每次同步、评分和生成必须可追溯、可重试、可审计；
- 第一阶段采用自动生成加人工审核，不做自动发布；
- 爆款是实验结果，不是系统可以承诺的标签。

## 下一步

1. 使用 10 只脱敏测试猫录入真实内容机会；
2. 人工录入 50—100 个高质量参考案例并抽象 10—20 个传播模式；
3. 由运营人员连续使用 T0 工作流，验证评分和排序是否有效；
4. 确认生产库只读视图并实现正式 Connector；
5. 进入 Phase T1：使用模型辅助拆解案例，但后续生成器只读取抽象模式；
6. 再进入候选自动生成、内容包生成和表现反馈。
