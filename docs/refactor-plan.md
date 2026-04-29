# GenericAgent TypeScript 重构计划

> 从 Python 3K 行极简架构迁移到 TypeScript 现代化实现

---

## 📋 目标与原则

### 保留的核心理念
- ✅ **极简架构** - 核心代码 <5K 行
- ✅ **自进化机制** - Skill 自动沉淀与复用
- ✅ **分层记忆系统** - L0-L4 记忆层级
- ✅ **最小工具集** - 9 个原子工具
- ✅ **流式执行** - 实时反馈用户

### 重构目标
- 🎯 **类型安全** - TypeScript 静态检查 + Zod 运行时校验
- 🎯 **异步优化** - 原生 async/await 替代 Generator
- 🎯 **安全加固** - 沙箱执行 + 信任边界标记
- 🎯 **生态升级** - Playwright + 现代 Bot SDK
- 🎯 **部署灵活** - 单文件可执行 + Docker + Serverless

---

## 🏗️ 技术栈选型

### 核心框架
```json
{
  "runtime": "Node.js 20+",
  "language": "TypeScript 5.x (strict mode)",
  "packageManager": "pnpm"
}
```

### 关键依赖
| 模块 | Python 当前 | TypeScript 重构 |
|------|-------------|----------------|
| **LLM 调用** | 手动 SSE 解析 | `@ai-sdk/anthropic` + `eventsource-parser` |
| **浏览器** | Selenium | Playwright |
| **参数校验** | 运行时检查 | Zod |
| **记忆存储** | JSON 文件 | SQLite (better-sqlite3) + FTS5 |
| **沙箱执行** | subprocess | VM2 / isolated-vm |
| **HTTP 客户端** | requests | native fetch |
| **流式处理** | Generator | AsyncGenerator |

### 前端（可选）
- **Web UI**: Next.js 15 (App Router + Server Actions)
- **桌面 UI**: Tauri (Rust 后端，比 Electron 更轻量)

---

## 📁 项目结构

```
generic-agent-ts/
├── src/
│   ├── core/
│   │   ├── agent-loop.ts          # Agent 执行循环 (~150 行)
│   │   ├── llm-client.ts          # LLM 适配层
│   │   ├── tool-dispatcher.ts     # 工具分发器
│   │   └── types.ts               # 核心类型定义
│   ├── tools/
│   │   ├── base.ts                # 工具基类
│   │   ├── code-run.ts            # 代码执行（沙箱）
│   │   ├── file-ops.ts            # 文件读写
│   │   ├── web-control.ts         # 浏览器控制
│   │   └── index.ts               # 工具注册表
│   ├── memory/
│   │   ├── layers/
│   │   │   ├── l0-meta.ts         # 元规则
│   │   │   ├── l1-index.ts        # 记忆索引
│   │   │   ├── l2-facts.ts        # 全局事实
│   │   │   ├── l3-skills.ts       # 技能库
│   │   │   └── l4-sessions.ts     # 会话归档
│   │   ├── storage.ts             # 存储抽象层
│   │   └── search.ts              # 全文搜索
│   ├── frontends/
│   │   ├── cli.ts                 # 命令行界面
│   │   ├── web/                   # Next.js Web UI
│   │   └── bots/
│   │       ├── telegram.ts
│   │       ├── discord.ts
│   │       └── slack.ts
│   ├── security/
│   │   ├── sandbox.ts             # 代码沙箱
│   │   ├── trust-boundary.ts      # 信任边界标记
│   │   └── rate-limiter.ts        # 速率限制
│   └── utils/
│       ├── logger.ts
│       ├── config.ts
│       └── token-counter.ts       # tiktoken 集成
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   └── migration-guide.md
├── scripts/
│   ├── build.ts
│   └── migrate-from-python.ts     # 数据迁移脚本
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 🔄 核心模块对比

### 1. Agent Loop

#### Python (Generator-based)
```python
def agent_runner_loop(client, system_prompt, user_input, handler, tools_schema):
    messages = [...]
    while turn < max_turns:
        response_gen = client.chat(messages=messages, tools=tools_schema)
        response = yield from response_gen
        
        for tc in tool_calls:
            gen = handler.dispatch(tool_name, args, response)
            outcome = yield from gen
            tool_results.append(...)
        
        messages.append({"role": "user", "content": next_prompt, "tool_results": tool_results})
```

#### TypeScript (AsyncGenerator-based)
```typescript
async function* agentRunnerLoop(
  client: LLMClient,
  systemPrompt: string,
  userInput: string,
  handler: ToolHandler,
  toolsSchema: ToolSchema[]
): AsyncGenerator<StreamChunk, ExitReason> {
  const messages: Message[] = [...]
  
  while (turn < maxTurns) {
    for await (const chunk of client.chat(messages, toolsSchema)) {
      yield chunk
    }
    
    for (const toolCall of response.toolCalls) {
      const outcome = await handler.dispatch(toolCall.name, toolCall.args)
      toolResults.push(...)
    }
    
    messages.push({ role: 'user', content: nextPrompt, toolResults })
  }
}
```

**改进点**:
- `for await...of` 替代 `yield from`，更直观
- 类型安全的 `Message` / `ToolCall` / `Outcome`
- 错误处理更清晰（try-catch 替代 StopIteration）

---

### 2. 工具分发

#### Python (动态 getattr)
```python
class BaseHandler:
    def dispatch(self, tool_name, args, response):
        method_name = f"do_{tool_name}"
        if hasattr(self, method_name):
            ret = yield from getattr(self, method_name)(args, response)
            return ret
```

#### TypeScript (类型安全 Record)
```typescript
type ToolHandler = (args: z.infer<typeof schema>) => Promise<ToolOutcome>

class ToolDispatcher {
  private handlers: Record<string, ToolHandler> = {
    code_run: this.handleCodeRun.bind(this),
    file_read: this.handleFileRead.bind(this),
    // ...
  }
  
  async dispatch(toolName: string, args: unknown): Promise<ToolOutcome> {
    const handler = this.handlers[toolName]
    if (!handler) throw new UnknownToolError(toolName)
    
    // Zod 运行时校验
    const schema = toolSchemas[toolName]
    const validatedArgs = schema.parse(args)
    
    return await handler(validatedArgs)
  }
}
```

**改进点**:
- 编译期检查工具名拼写错误
- Zod 自动生成 TypeScript 类型
- 参数校验失败时提供详细错误信息

---

### 3. LLM 客户端

#### Python (手动 SSE 解析)
```python
def _parse_claude_sse(resp_lines):
    content_blocks = []
    for line in resp_lines:
        if line.startswith("data:"):
            evt = json.loads(line[5:])
            if evt["type"] == "content_block_delta":
                yield evt["delta"]["text"]
    return content_blocks
```

#### TypeScript (eventsource-parser)
```typescript
import { createParser } from 'eventsource-parser'

async function* parseClaudeSSE(response: Response): AsyncGenerator<string, ContentBlock[]> {
  const parser = createParser((event) => {
    if (event.type === 'event') {
      const data = JSON.parse(event.data)
      if (data.type === 'content_block_delta') {
        queue.push(data.delta.text)
      }
    }
  })
  
  for await (const chunk of response.body!) {
    parser.feed(new TextDecoder().decode(chunk))
    while (queue.length > 0) yield queue.shift()!
  }
  
  return contentBlocks
}
```

**改进点**:
- 使用成熟的 SSE 解析库
- 类型安全的事件处理
- 更好的错误恢复

---

### 4. 代码沙箱

#### Python (subprocess，无沙箱)
```python
def do_code_run(self, args, response):
    script = args['script']
    result = subprocess.run(['python', '-c', script], capture_output=True)
    return StepOutcome(result.stdout.decode())
```

#### TypeScript (VM2 沙箱)
```typescript
import { VM } from 'vm2'

async handleCodeRun(args: CodeRunArgs): Promise<ToolOutcome> {
  const vm = new VM({
    timeout: 5000,
    sandbox: {
      console: sandboxedConsole,
      fetch: sandboxedFetch,
      // 只暴露安全的 API
    }
  })
  
  try {
    const result = await vm.run(args.script)
    return {
      data: wrapUntrusted(result), // 信任边界标记
      nextPrompt: '代码执行成功'
    }
  } catch (error) {
    return {
      data: null,
      nextPrompt: `执行失败: ${error.message}`
    }
  }
}

function wrapUntrusted(data: unknown): string {
  return `<UNTRUSTED_TOOL_OUTPUT>\n${JSON.stringify(data)}\n</UNTRUSTED_TOOL_OUTPUT>`
}
```

**改进点**:
- VM2 隔离执行环境
- 超时保护
- 信任边界标记（防御 Prompt Injection）
- 可配置的沙箱权限

---

## 🔒 安全加固

### 1. 信任边界标记
```typescript
enum TrustLevel {
  SYSTEM = 'system',      // 系统消息
  USER = 'user',          // 用户输入
  TOOL_SAFE = 'tool_safe', // 本地文件读取
  TOOL_UNTRUSTED = 'tool_untrusted' // 网络请求、代码执行
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  trustLevel?: TrustLevel
}

function formatToolResult(result: unknown, trustLevel: TrustLevel): string {
  if (trustLevel === TrustLevel.TOOL_UNTRUSTED) {
    return `<UNTRUSTED_TOOL_OUTPUT>\n${result}\n</UNTRUSTED_TOOL_OUTPUT>`
  }
  return String(result)
}
```

### 2. Zod 参数校验
```typescript
import { z } from 'zod'

const codeRunSchema = z.object({
  script: z.string().max(10000),
  language: z.enum(['javascript', 'typescript', 'python']),
  timeout: z.number().int().min(100).max(30000).default(5000)
})

type CodeRunArgs = z.infer<typeof codeRunSchema>

// 自动生成 JSON Schema 给 LLM
const toolSchema = zodToJsonSchema(codeRunSchema)
```

### 3. 速率限制
```typescript
import { RateLimiter } from 'limiter'

class ToolDispatcher {
  private limiters = {
    code_run: new RateLimiter({ tokensPerInterval: 10, interval: 'minute' }),
    web_scan: new RateLimiter({ tokensPerInterval: 30, interval: 'minute' })
  }
  
  async dispatch(toolName: string, args: unknown) {
    await this.limiters[toolName]?.removeTokens(1)
    // ...
  }
}
```

---

## 💾 记忆系统升级

### Python (JSON 文件)
```python
# memory/L3_skills/web_scraping.md
# memory/L2_global_facts/user_preferences.json
```

### TypeScript (SQLite + FTS5)
```typescript
import Database from 'better-sqlite3'

class MemoryStorage {
  private db: Database.Database
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts 
      USING fts5(name, description, content, tags);
      
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        layer TEXT CHECK(layer IN ('L0', 'L1', 'L2', 'L3', 'L4')),
        content TEXT,
        metadata JSON,
        created_at INTEGER,
        updated_at INTEGER
      );
    `)
  }
  
  searchSkills(query: string, layer?: string): Skill[] {
    return this.db.prepare(`
      SELECT s.* FROM skills s
      JOIN skills_fts fts ON s.id = fts.rowid
      WHERE skills_fts MATCH ?
      ${layer ? 'AND s.layer = ?' : ''}
      ORDER BY rank
      LIMIT 10
    `).all(query, layer)
  }
}
```

**优势**:
- 全文搜索（FTS5）比文件遍历快 100x
- 事务支持（原子性更新）
- 结构化查询（复杂过滤条件）
- 备份简单（单个 .db 文件）

---

## 🌐 浏览器自动化升级

### Python (Selenium)
```python
from selenium import webdriver
driver = webdriver.Chrome()
driver.get(url)
element = driver.find_element(By.ID, 'submit')
element.click()
```

### TypeScript (Playwright)
```typescript
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({
  // 保留登录态
  storageState: 'auth.json'
})
const page = await context.newPage()

await page.goto(url)
await page.locator('#submit').click()

// 自动等待、重试、截图
await page.waitForSelector('.result', { timeout: 5000 })
await page.screenshot({ path: 'result.png' })
```

**优势**:
- 自动等待（无需 `time.sleep`）
- 更快（Chrome DevTools Protocol）
- 更稳定（自动重试）
- 内置截图、录屏、网络拦截

---

## 📦 部署方案

### 1. 单文件可执行程序
```bash
pnpm build
pnpm package  # 使用 pkg 或 nexe

# 输出
dist/
  ├── generic-agent-win.exe
  ├── generic-agent-macos
  └── generic-agent-linux
```

### 2. Docker 镜像
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["node", "dist/cli.js"]
```

### 3. Serverless (可选)
```typescript
// Vercel Edge Function
export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { message } = await req.json()
  const stream = agentRunnerLoop(client, systemPrompt, message, handler, tools)
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(new TextEncoder().encode(chunk))
        }
        controller.close()
      }
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  )
}
```

---

## 🧪 测试策略

### 单元测试 (Vitest)
```typescript
import { describe, it, expect } from 'vitest'

describe('ToolDispatcher', () => {
  it('should validate args with Zod', async () => {
    const dispatcher = new ToolDispatcher()
    
    await expect(
      dispatcher.dispatch('code_run', { script: 123 }) // 类型错误
    ).rejects.toThrow(ZodError)
  })
  
  it('should wrap untrusted output', async () => {
    const result = await dispatcher.dispatch('web_scan', { url: 'https://evil.com' })
    expect(result.data).toContain('<UNTRUSTED_TOOL_OUTPUT>')
  })
})
```

### 集成测试 (Playwright Test)
```typescript
import { test, expect } from '@playwright/test'

test('agent can control browser', async ({ page }) => {
  const agent = new Agent(config)
  
  await agent.execute('打开 GitHub 并搜索 TypeScript')
  
  await expect(page).toHaveURL(/github.com\/search/)
  await expect(page.locator('input[name="q"]')).toHaveValue('TypeScript')
})
```

---

## 📅 迁移路线图

### Phase 1: 核心框架 (2 周)
- [ ] 搭建项目骨架
- [ ] 实现 Agent Loop (AsyncGenerator)
- [ ] LLM 客户端适配（Claude / OpenAI）
- [ ] 工具分发器 + Zod 校验

### Phase 2: 工具实现 (2 周)
- [ ] `code_run` (VM2 沙箱)
- [ ] `file_read` / `file_write` / `file_patch`
- [ ] `web_scan` / `web_execute_js` (Playwright)
- [ ] `ask_user`

### Phase 3: 记忆系统 (1 周)
- [ ] SQLite 存储层
- [ ] L0-L4 记忆层实现
- [ ] 全文搜索（FTS5）
- [ ] 数据迁移脚本（Python → TypeScript）

### Phase 4: 安全加固 (1 周)
- [ ] 信任边界标记
- [ ] 速率限制
- [ ] 审计日志
- [ ] 敏感信息过滤

### Phase 5: 前端 (2 周)
- [ ] CLI 界面
- [ ] Next.js Web UI
- [ ] Telegram Bot
- [ ] Discord Bot

### Phase 6: 测试与文档 (1 周)
- [ ] 单元测试覆盖率 >80%
- [ ] 集成测试
- [ ] API 文档
- [ ] 迁移指南

---

## 🎯 成功指标

### 性能
- [ ] Agent Loop 延迟 <100ms
- [ ] 内存占用 <200MB（空闲）
- [ ] 启动时间 <2s

### 安全
- [ ] 所有工具返回值带信任标记
- [ ] 代码沙箱通过 OWASP 测试
- [ ] 无敏感信息泄露

### 兼容性
- [ ] 支持 Windows / macOS / Linux
- [ ] Node.js 20+ 兼容
- [ ] 可从 Python 版本无损迁移数据

### 开发体验
- [ ] TypeScript 类型覆盖率 100%
- [ ] 所有 API 有 JSDoc 注释
- [ ] 提供 VS Code 插件（可选）

---

## 📚 参考资料

- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Playwright Documentation](https://playwright.dev/)
- [Zod Documentation](https://zod.dev/)
- [VM2 Security Guide](https://github.com/patriksimek/vm2)
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
