# GenericAgent TypeScript

> 🤖 极简自进化 AI Agent 框架 - TypeScript 重构版

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

## ✨ 特性

- 🎯 **极简架构** - 核心代码 <5K 行，易于理解和扩展
- 🧠 **自进化机制** - 技能自动沉淀与复用（L3 技能库）
- 💾 **分层记忆** - L0-L4 记忆层级，SQLite FTS5 全文搜索
- 🔧 **最小工具集** - 9 个原子工具，覆盖常见场景
- 🔒 **安全加固** - VM2 沙箱、信任边界标记、Zod 校验
- 🌊 **流式执行** - AsyncGenerator 实时反馈
- 🎭 **浏览器自动化** - Playwright 替代 Selenium
- 📦 **灵活部署** - CLI / Docker / Serverless

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/hj01857655/generic-agent-ts.git
cd generic-agent-ts

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Key
```

### 运行

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 运行 CLI
pnpm start
```

## 📖 文档

- [架构设计](./docs/architecture.md)
- [API 参考](./docs/api-reference.md)
- [迁移指南](./docs/migration-guide.md)（从 Python 版本）

## 🛠️ 技术栈

| 模块 | 技术选型 |
|------|----------|
| 运行时 | Node.js 20+ |
| 语言 | TypeScript 5.x (strict mode) |
| LLM 调用 | Vercel AI SDK |
| 浏览器 | Playwright |
| 参数校验 | Zod |
| 记忆存储 | SQLite + FTS5 |
| 沙箱执行 | VM2 |
| 测试框架 | Vitest |

## 🏗️ 项目结构

```
src/
├── core/              # 核心框架
│   ├── agent-loop.ts  # Agent 执行循环
│   ├── llm-client.ts  # LLM 适配层
│   └── types.ts       # 类型定义
├── tools/             # 工具系统
├── memory/            # 记忆系统
├── frontends/         # 前端接口
├── security/          # 安全模块
└── utils/             # 工具函数
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT](./LICENSE)

## 🔗 相关项目

- [GenericAgent (Python 原版)](https://github.com/lsdefine/GenericAgent)
- [技术报告](https://arxiv.org/abs/2604.17091)

---

**开发中** 🚧 当前版本：v0.1.0 (Phase 1)
