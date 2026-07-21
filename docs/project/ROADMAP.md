# Bangcat AI Platform 路线图

本路线图按“先建立可靠基础，再增加 AI 自动化”的顺序推进。优先级由项目负责人和用户共同确认。

## Milestone 0：项目操作系统

目标：让多 AI 协作可追踪、可审查、可持续。

- [x] 技术栈和架构 ADR；
- [x] CI 基础；
- [x] Agent 合作契约；
- [x] Issue、PR、Review 和 Handoff 模板；
- [x] 项目状态与路线图；
- [x] 提交依赖锁文件并启用 `npm ci`；
- [ ] 配置 main 分支保护和 required checks。

## Milestone 1：生产数据与部署基础

目标：AI 平台可以安全读取旧平台公开数据，并能在测试环境可靠部署。

- [ ] 建立旧业务库 `ai_public_*` Views；
- [ ] 建立 SELECT-only 来源账号；
- [ ] 建立 AI MySQL 首次 Migration；
- [ ] 空库和升级库 Migration 测试；
- [ ] `catnoteapi_v2` AI 代理与权限传递；
- [ ] Redis 测试/生产配置；
- [ ] COS 测试/生产命名空间；
- [ ] 结构化日志和 OpenTelemetry Collector；
- [ ] API、Worker、数据库、Redis、COS 健康检查；
- [ ] 备份和回滚演练。

## Milestone 2：Topic Engine T1 案例拆解

目标：AI 辅助提炼传播模式，不复制第三方内容。

- [ ] `ReferenceAnalysis` JSON Schema 与版本管理；
- [ ] 文本/多模态模型 Provider 接口；
- [ ] Reference Analysis BullMQ Worker；
- [ ] Prompt、模型、Token、费用、延迟、错误记录；
- [ ] 原文与下游生成上下文隔离；
- [ ] 人工审核和模式批准流程；
- [ ] 质量评测数据集；
- [ ] 失败重试、取消和人工恢复。

## Milestone 3：候选自动生成与排序

目标：结合猫咪事实、趋势和传播模式，生成原创候选。

- [ ] Cat Opportunity Index 自动更新；
- [ ] 候选生成 Worker；
- [ ] 可解释评分校准；
- [ ] 原创性、事实与授权 Gate；
- [ ] 候选对比和人工选择；
- [ ] 使用 10+ 测试猫和 20+ 案例进行运营验收。

## Milestone 4：图文内容包

目标：生成可人工审核的公众号、小红书等内容包。

- [ ] 标题、正文、卡片、素材清单；
- [ ] 事实引用和内容级别标识；
- [ ] Prompt/输出版本管理；
- [ ] 人工编辑、审核和导出；
- [ ] COS 资产链路；
- [ ] 内容质量与成本指标。

## Milestone 5：视频内容包

目标：生成脚本、分镜、字幕、旁白和媒体任务。

- [ ] 视频脚本和分镜 Schema；
- [ ] 图片/视频 Provider 抽象；
- [ ] 媒体生成与转码 Worker；
- [ ] 角色一致性和素材授权检查；
- [ ] 失败恢复和成本控制；
- [ ] 人工成片审核。

## Milestone 6：发布与反馈闭环

目标：人工批准后发布，并把表现数据回流选题引擎。

- [ ] 平台发布准备包；
- [ ] 审批和发布日志；
- [ ] 表现指标导入；
- [ ] Topic / Pattern / Cat / Prompt 归因；
- [ ] 实验和评分权重更新；
- [ ] 运营看板。

## 明确不提前做

- 不在基础设施完成前接入大规模模型调用；
- 不自动发布未经人工审核的内容；
- 不开放公网 MCP；
- 不使用全面微服务或 Kubernetes；
- 不让 AI 服务写入旧业务库；
- 不复制或保存第三方完整作品作为下游生成模板。
