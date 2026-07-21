# 项目组运作模型

## 1. 项目负责人

项目负责人负责和用户讨论产品方向、优先级、范围、架构取舍与验收标准，并维护项目主线一致性。项目负责人不把未经拆解的大任务直接交给执行 Agent，也不以“代码能运行”代替业务验收。

主要职责：

- 把业务讨论转化为可执行 Issue；
- 明确优先级、依赖、非目标和验收标准；
- 维护产品路线图、技术架构和决策记录；
- 调度执行 Agent、审查 Agent 和验证 Agent；
- 判断是否允许合并和发布；
- 对仓库整洁、风险控制与持续推进负责。

## 2. AI 团队角色

### Product / Architecture Lead

- 与用户确认目标和约束；
- 拆分工作项；
- 审批架构和数据边界变化；
- 汇总审查证据；
- 决定合并顺序。

### Delivery Agent

- 只实现一个明确 Issue；
- 在独立分支工作；
- 编写测试和迁移说明；
- 提交可审查 PR；
- 不自行批准自己的 PR。

### Review Agent

- 使用独立上下文阅读 Issue、ADR、代码 diff 和测试；
- 查找逻辑错误、架构偏离、隐私风险、数据迁移风险和测试缺口；
- 按 Blocker / Major / Minor 输出发现；
- 不直接掩盖问题或仅做表面格式检查。

### Verification Agent

- 复现构建、测试、Migration 和失败场景；
- 检查 CI 证据、数据库权限和回滚步骤；
- 对作者声明进行独立验证；
- 输出明确的 pass / fail 及证据。

### Release Integrator

- 确认审查问题已经关闭；
- 确认 CI 全绿、分支已同步 main；
- 按发布和回滚方案执行合并；
- 合并后确认主干状态并清理分支。

这些角色可以由不同 AI 会话或人类承担，但同一变更的作者与最终审查者必须分离。

## 3. 标准工作流

```text
业务讨论
  ↓
项目负责人形成 Issue / ADR
  ↓
Delivery Agent 独立分支开发
  ↓
Draft PR + 持续 CI
  ↓
Review Agent 独立审查
  ↓
Delivery Agent 修正
  ↓
Verification Agent 验证
  ↓
项目负责人批准合并
  ↓
Release Integrator 合入 main 并清分支
  ↓
更新 PROJECT_STATUS / ROADMAP
```

## 4. 并行开发原则

允许多个 Delivery Agent 并行，但必须满足：

- 不修改同一高冲突文件，或先约定接口；
- 每项工作有独立 Issue 和分支；
- 公共 Schema、核心领域类型和 CI 配置由项目负责人协调；
- 依赖关系在 Issue 中明确；
- 后合并的分支必须重新同步 main 并重新跑 CI。

## 5. 决策记录

- 产品范围和优先级写入 Issue、Roadmap 或 Project Status；
- 长期技术决策写入 ADR；
- 临时实现细节写入 PR；
- 交接写入 Handoff；
- 不把关键决策只留在聊天记录里。

## 6. 合并权限

只有满足以下条件才允许合并：

- Issue 验收标准完成；
- 独立审查完成；
- Blocker / Major 已解决；
- CI 全绿；
- 数据、隐私、部署与回滚影响明确；
- 文档同步完成；
- 项目负责人确认合并顺序和风险可接受。
