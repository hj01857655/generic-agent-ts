# GenericAgent TypeScript

> 🤖 极简自进化 AI Agent 框架 - TypeScript 重构版

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

## ✨ 特性

- 🎯 **极简架构** - 核心代码 <3K 行，易于理解和扩展
- 🧠 **自进化机制** - 技能自动沉淀与复用（L3 技能库）
- 💾 **分层记忆** - L0-L4 记忆层级，SQLite FTS5 全文搜索
- 🔧 **完整工具集** - 9 个原子工具，覆盖常见场景
- 🔒 **安全加固** - VM2 沙箱、信任边界标记、Zod 校验
- 🌊 **流式执行** - AsyncGenerator 实时反馈
- 🎭 **浏览器自动化** - Playwright 替代 Selenium
- 📦 **灵活部署** - CLI / Docker / Serverless
- 🔄 **回调系统** - 工具执行前后、轮次结束回调
- 💾 **Session 管理** - 会话持久化、历史压缩

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

- [开发指南](./docs/development.md)
- [架构设计](./docs/architecture.md)
- [API 参考](./docs/api-reference.md)
- [迁移指南](./docs/migration-guide.md)（从 Python 版本）

## 🎯 使用示例

### 基础使用

```typescript
import { 
  LLMClient, 
  ToolDispatcher, 
  agentRunnerLoop, 
  getDefaultTools, 
  loadConfig, 
  getApiKey 
} from 'generic-agent-ts'

const config = loadConfig()
const client = new LLMClient({
  provider: config.provider,
  model: config.model,
  apiKey: getApiKey(config.provider),
})

const dispatcher = new ToolDispatcher()
dispatcher.registerAll(getDefaultTools(config.data_dir))

const stream = agentRunnerLoop(client, dispatcher, '你的问题', {
  maxTurns: config.max_turns,
  systemPrompt: config.system_prompt,
  verbose: true,
})

for await (const chunk of stream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.content)
  }
}
```

### 使用回调系统

```typescript
import { LoggingCallbacks } from 'generic-agent-ts'

const callbacks = new LoggingCallbacks()

const stream = agentRunnerLoop(client, dispatcher, userInput, {
  maxTurns: 20,
  systemPrompt: '...',
  callbacks, // 添加回调
})
```

### 使用 Session 管理

```typescript
import { SessionManager } from 'generic-agent-ts'

const sessionManager = new SessionManager('./.generic-agent')
const session = await sessionManager.load('my-session')

const stream = agentRunnerLoop(client, dispatcher, userInput, {
  maxTurns: 20,
  systemPrompt: '...',
  session, // 添加 Session
})

await session.save() // 保存会话
```

## 🛠️ 技术栈

| 模块 | 技术选型 |
|------|----------|
| 运行时 | Node.js 20+ |
| 语言 | TypeScript 5.x (strict mode) |
| LLM 调用 | Vercel AI SDK |
| 浏览器 | Playwright |
| 参数校验 | Zod |
| 记忆存储 | SQLite + FTS5 (better-sqlite3) |
| 沙箱执行 | VM2 |
| 测试框架 | Vitest |

## 🔧 已实现工具（9/9）

| 工具 | 说明 | 状态 |
|------|------|------|
| `file_read` | 读取文件内容 | ✅ |
| `file_write` | 写入文件内容 | ✅ |
| `ask_user` | 询问用户获取输入 | ✅ |
| `code_run` | 沙箱代码执行 (VM2) | ✅ |
| `web_scan` | 网页内容抓取 | ✅ |
| `web_control` | 浏览器控制 (Playwright) | ✅ |
| `mem_search` | 记忆搜索 (FTS5) | ✅ |
| `mem_write` | 记忆写入 | ✅ |
| `reflect` | 反思总结 | ✅ |

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
