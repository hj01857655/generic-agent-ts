# 开发指南

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. 运行开发模式

```bash
pnpm dev "你的问题"
```

### 4. 构建

```bash
pnpm build
```

---

## 项目结构

```
src/
├── core/              # 核心框架
│   ├── types.ts       # 类型定义
│   ├── llm-client.ts  # LLM 客户端
│   ├── agent-loop.ts  # Agent 主循环
│   └── tool-dispatcher.ts  # 工具分发器
├── tools/             # 工具实现
│   ├── base.ts        # 工具基类
│   ├── file-read.ts   # 文件读取
│   ├── file-write.ts  # 文件写入
│   ├── ask-user.ts    # 询问用户
│   ├── code-run.ts    # 代码执行（沙箱）
│   ├── web-scan.ts    # 网页抓取
│   └── index.ts       # 工具注册表
├── utils/             # 工具函数
│   └── config.ts      # 配置管理
└── cli.ts             # CLI 入口
```

---

## 添加新工具

### 1. 创建工具文件

```typescript
// src/tools/my-tool.ts
import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

const myToolSchema = z.object({
  param1: z.string().describe('参数描述'),
  param2: z.number().optional().describe('可选参数'),
})

export class MyTool extends BaseTool<typeof myToolSchema> {
  readonly name = 'my_tool'
  readonly description = '工具描述'
  readonly parameters = myToolSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(args: z.infer<typeof myToolSchema>): Promise<ToolOutcome> {
    try {
      // 实现工具逻辑
      const result = doSomething(args.param1)

      return this.success(
        result,
        '执行成功的提示',
        TrustLevel.TOOL_SAFE
      )
    } catch (error) {
      return this.failure(`执行失败: ${error.message}`)
    }
  }
}
```

### 2. 注册工具

在 `src/tools/index.ts` 中：

```typescript
export { MyTool } from './my-tool'
import { MyTool } from './my-tool'

export function getDefaultTools(): BaseTool[] {
  return [
    // ... 其他工具
    new MyTool(),
  ]
}
```

---

## 信任级别

工具返回的数据需要标记信任级别：

| 级别 | 说明 | 示例 |
|------|------|------|
| `TOOL_SAFE` | 本地安全数据 | 文件读取、本地计算 |
| `TOOL_UNTRUSTED` | 外部不可信数据 | 网络请求、代码执行 |
| `USER` | 用户输入 | ask_user 工具 |
| `SYSTEM` | 系统消息 | 系统提示词 |

**不可信数据会被包裹**：

```
<UNTRUSTED_TOOL_OUTPUT>
... 数据内容 ...
</UNTRUSTED_TOOL_OUTPUT>
```

这样可以防御 Prompt Injection 攻击。

---

## 测试

### 单元测试

```bash
pnpm test
```

### 测试单个工具

```typescript
import { FileReadTool } from './tools/file-read'

const tool = new FileReadTool()
const result = await tool.execute({ path: 'test.txt' })
console.log(result)
```

---

## 调试

### 启用详细日志

```bash
LOG_LEVEL=debug pnpm dev "你的问题"
```

### 查看工具调用

Agent 会实时输出工具调用信息：

```
[Tool: file_read] 成功读取文件: test.txt (123 字符)
[Tool: code_run] 代码执行成功
```

---

## 常见问题

### Q: 如何切换 LLM 提供商？

修改 `.env` 文件：

```env
# 使用 Claude
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your_key

# 或使用 OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
```

### Q: 如何限制工具执行时间？

在工具参数中设置 `timeout`：

```typescript
const codeRunSchema = z.object({
  code: z.string(),
  timeout: z.number().default(5000), // 5 秒
})
```

### Q: 如何处理大文件？

使用流式读取或分块处理：

```typescript
import { createReadStream } from 'node:fs'

const stream = createReadStream(path, { encoding: 'utf-8' })
for await (const chunk of stream) {
  // 处理 chunk
}
```

---

## 贡献指南

1. Fork 仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 提交改动：`git commit -m "feat: 添加新功能"`
4. 推送分支：`git push origin feature/my-feature`
5. 提交 Pull Request

### Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

---

## 下一步

- [ ] 实现 Playwright 浏览器控制工具
- [ ] 实现 SQLite 记忆系统
- [ ] 添加单元测试
- [ ] 实现 Web UI
- [ ] 支持 Telegram/Discord Bot

