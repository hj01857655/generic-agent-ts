# GenericAgent 文档索引

> TypeScript 重构项目文档中心

---

## 📚 核心文档

### [重构计划](./refactor-plan.md)
完整的 TypeScript 重构方案，包括：
- 技术栈选型（Node.js + TypeScript + Playwright）
- 项目结构设计
- 核心模块对比（Python vs TypeScript）
- 安全加固方案
- 迁移路线图（6 个阶段）

**适合人群**: 架构师、核心开发者

---

### [未解决问题分析](./issues-analysis.md)
基于 GitHub Issues 的问题总结（13 个未解决问题）：
- **P0 级别**: Prompt Injection 风险、隐私泄露
- **P1 级别**: 上下文管理、任务通知、数据迁移
- **P2 级别**: 环境兼容性、配置优化

**适合人群**: 所有开发者、安全审计人员

---

## 🎯 快速导航

### 按角色查看

#### 架构师
1. [重构计划 - 技术栈选型](./refactor-plan.md#-技术栈选型)
2. [重构计划 - 项目结构](./refactor-plan.md#-项目结构)
3. [重构计划 - 核心模块对比](./refactor-plan.md#-核心模块对比)

#### 安全工程师
1. [问题分析 - P0 安全问题](./issues-analysis.md#-p0---安全与架构问题)
2. [重构计划 - 安全加固](./refactor-plan.md#-安全加固)

#### 前端开发者
1. [重构计划 - 前端技术栈](./refactor-plan.md#前端可选)
2. [问题分析 - UI 体验问题](./issues-analysis.md#13-ui-状态不持久化-200)

#### 运维工程师
1. [重构计划 - 部署方案](./refactor-plan.md#-部署方案)
2. [问题分析 - 环境兼容性](./issues-analysis.md#7-wsl-环境启动失败-194)

---

## 📊 项目状态

### 当前阶段
🔄 **Phase 0: 需求分析与方案设计**

### 已完成
- ✅ 原项目代码分析
- ✅ GitHub Issues 梳理
- ✅ 技术栈选型
- ✅ 架构设计

### 进行中
- 🚧 详细设计文档编写
- 🚧 PoC 原型开发

### 待开始
- ⏳ Phase 1: 核心框架实现
- ⏳ Phase 2: 工具实现
- ⏳ Phase 3: 记忆系统
- ⏳ Phase 4: 安全加固
- ⏳ Phase 5: 前端开发
- ⏳ Phase 6: 测试与文档

---

## 🔗 外部资源

### 原项目
- [GenericAgent GitHub](https://github.com/lsdefine/GenericAgent)
- [技术报告 (arXiv)](https://arxiv.org/abs/2604.17091)
- [入门教程 (Datawhale)](https://datawhalechina.github.io/hello-generic-agent/)

### 技术参考
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Playwright 文档](https://playwright.dev/)
- [Zod 文档](https://zod.dev/)
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

---

## 📝 文档贡献指南

### 文档结构规范
```
docs/
├── README.md              # 本文件（索引）
├── refactor-plan.md       # 重构计划
├── issues-analysis.md     # 问题分析
├── architecture.md        # 架构设计（待补充）
├── api-reference.md       # API 文档（待补充）
└── migration-guide.md     # 迁移指南（待补充）
```

### 编写规范
- 使用 Markdown 格式
- 代码块标注语言（```typescript, ```python）
- 添加目录导航（长文档）
- 使用 emoji 增强可读性（适度）
- 中英文混排时注意空格

### 更新流程
1. 在 `docs/` 目录下创建/编辑文档
2. 更新本文件（README.md）的索引
3. 提交 PR 并说明变更内容

---

## 📅 更新日志

### 2026-04-28
- 创建文档目录结构
- 完成重构计划文档（620 行）
- 完成问题分析文档（380 行）
- 创建文档索引（本文件）

---

## 💬 反馈与讨论

有问题或建议？欢迎：
- 提交 GitHub Issue
- 在讨论区留言
- 联系项目维护者

---

**最后更新**: 2026-04-28  
**文档版本**: v0.1.0
