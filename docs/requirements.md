# GenericAgent TypeScript 重构 - 需求规划

## 一、项目背景

### 1.1 现状分析

**Python 版本特点**：
- 代码量：~3000 行
- 核心架构：极简、自进化
- 技术栈：Python 3.x + Selenium + Generator
- 部署方式：单文件脚本
- 主要问题：
  - 缺乏类型安全（运行时错误多）
  - Generator 嵌套复杂（`yield from` 难调试）
  - 浏览器自动化不稳定（Selenium 等待机制差）
  - 代码沙箱缺失（subprocess 直接执行）
  - 记忆系统性能差（JSON 文件遍历）

**重构驱动因素**：
1. **类型安全**：TypeScript 静态检查 + Zod 运行时校验
2. **性能优化**：SQLite FTS5 替代 JSON 文件
3. **安全加固**：VM2 沙箱 + 信任边界标记
4. **生态升级**：Playwright + 现代 Bot SDK
5. **部署灵活**：单文件可执行 + Docker + Serverless

### 1.2 核心理念保留

| 理念 | 说明 | 实现方式 |
|------|------|----------|
| **极简架构** | 核心代码 <5K 行 | 严格控制模块边界 |
| **自进化机制** | Skill 自动沉淀与复用 | L3 技能库 + 自动提取 |
| **分层记忆** | L0-L4 记忆层级 | SQLite 表结构映射 |
| **最小工具集** | 9 个原子工具 | 工具注册表 + Zod Schema |
| **流式执行** | 实时反馈用户 | AsyncGenerator + SSE |

---

## 二、功能需求

### 2.1 核心功能（MVP）

#### F1. Agent 执行循环
**需求描述**：实现基于 AsyncGenerator 的 Agent 主循环

**功能点**：
- [x] 支持多轮对话（max_turns 可配置）
- [x] 流式输出（实时返回 LLM 响应）
- [x] 工具调用分发（tool_use 块解析）
- [x] 错误恢复（工具失败后继续执行）
- [x] 退出条件（end_turn / max_turns / 用户中断）

**验收标准**：
```typescript
const stream = agentRunnerLoop(client, systemPrompt, userInput, handler, tools)
for await (const chunk of stream) {
  console.log(chunk) // 实时输出
}
```

---

#### F2. LLM 客户端适配
**需求描述**：统一 Claude / OpenAI / 本地模型调用接口

**功能点**：
- [x] Claude API（Messages API + SSE 流式）
- [x] OpenAI API（Chat Completions + function calling）
- [x] 本地模型（Ollama / LM Studio）
- [x] 自动重试（429 / 500 错误）
- [x] Token 计数（tiktoken 集成）

**接口设计**：
```typescript
interface LLMClient {
  chat(messages: Message[], tools: ToolSchema[]): AsyncGenerator<StreamChunk>
  countTokens(text: string): number
}
```

**验收标准**：
- 支持切换 LLM 提供商（环境变量配置）
- 流式输出延迟 <100ms
- 错误重试最多 3 次

---

#### F3. 工具系统
**需求描述**：实现 9 个原子工具 + 工具分发器

**工具清单**：
1. `code_run` - 代码执行（Python/JS/Shell）
2. `file_read` - 文件读取
3. `file_write` - 文件写入
4. `web_scan` - 网页抓取
5. `web_control` - 浏览器控制
6. `mem_search` - 记忆搜索
7. `mem_write` - 记忆写入
8. `plan_make` - 计划制定
9. `reflect` - 反思总结

**工具分发器**：
```typescript
class ToolDispatcher {
  async dispatch(toolName: string, args: unknown): Promise<ToolOutcome>
}
```

**验收标准**：
- 所有工具参数通过 Zod 校验
- 工具执行超时保护（默认 30s）
- 工具输出包含信任边界标记

---

#### F4. 记忆系统
**需求描述**：实现 L0-L4 分层记忆 + 全文搜索

**层级设计**：
| 层级 | 名称 | 存储内容 | 更新频率 |
|------|------|----------|----------|
| L0 | 元规则 | 系统提示词、工具 Schema | 手动 |
| L1 | 记忆索引 | 记忆标签、关键词 | 每次写入 |
| L2 | 全局事实 | 用户偏好、环境信息 | 按需更新 |
| L3 | 技能库 | 可复用的操作流程 | 自动沉淀 |
| L4 | 会话归档 | 历史对话记录 | 每次会话结束 |

**存储方案**：
- SQLite + FTS5 全文搜索
- 单个 `.db` 文件（便于备份）
- 事务支持（原子性更新）

**验收标准**：
- 记忆搜索响应时间 <50ms
- 支持模糊搜索（拼音、同义词）
- 自动压缩历史会话（>100 轮）

---

#### F5. 浏览器自动化
**需求描述**：使用 Playwright 替代 Selenium

**功能点**：
- [x] 页面导航（goto / back / forward）
- [x] 元素操作（click / fill / select）
- [x] 等待机制（自动等待 / 显式等待）
- [x] 截图录屏（screenshot / video）
- [x] 网络拦截（request / response）
- [x] 登录态保存（storageState）

**验收标准**：
- 无需手动 `sleep`（自动等待）
- 支持无头模式 + 有头模式
- 截图自动保存到记忆系统

---

### 2.2 高级功能（V2）

#### F6. 代码沙箱
**需求描述**：隔离执行用户代码，防止恶意操作

**安全措施**：
- VM2 / isolated-vm 隔离
- 超时保护（5s）
- 文件系统限制（只读 / 白名单目录）
- 网络限制（禁止外部请求）

**验收标准**：
- 恶意代码无法访问宿主机文件
- 死循环自动终止
- 沙箱崩溃不影响主进程

---

#### F7. 多前端支持
**需求描述**：支持 CLI / Web / Bot 多种交互方式

**前端清单**：
1. **CLI**：命令行交互（默认）
2. **Web UI**：Next.js 15 + Server Actions
3. **Telegram Bot**：`node-telegram-bot-api`
4. **Discord Bot**：`discord.js`
5. **Slack Bot**：`@slack/bolt`

**验收标准**：
- 所有前端共享同一 Agent 核心
- 支持流式输出（SSE / WebSocket）
- 支持多用户并发（会话隔离）

---

#### F8. 插件系统
**需求描述**：支持第三方工具扩展

**插件接口**：
```typescript
interface Plugin {
  name: string
  schema: z.ZodObject<any>
  execute(args: unknown): Promise<ToolOutcome>
}
```

**验收标准**：
- 插件热加载（无需重启）
- 插件沙箱隔离
- 插件市场（可选）

---

## 三、非功能需求

### 3.1 性能要求

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| Agent 响应延迟 | <200ms（首 token） | 计时器 |
| 记忆搜索延迟 | <50ms | SQLite EXPLAIN |
| 工具执行超时 | 30s（可配置） | Promise.race |
| 并发用户数 | 100+（Web UI） | 压力测试 |
| 内存占用 | <500MB（单会话） | process.memoryUsage() |

---

### 3.2 安全要求

| 需求 | 实现方式 |
|------|----------|
| **代码沙箱** | VM2 隔离执行 |
| **信任边界** | `<UNTRUSTED_TOOL_OUTPUT>` 标记 |
| **输入校验** | Zod Schema 校验 |
| **敏感信息** | 环境变量 + .env 文件 |
| **速率限制** | Token Bucket 算法 |

---

### 3.3 可维护性要求

| 需求 | 实现方式 |
|------|----------|
| **代码规范** | ESLint + Prettier |
| **类型覆盖** | TypeScript strict mode |
| **测试覆盖** | >80%（Vitest） |
| **文档完整** | JSDoc + API Reference |
| **日志追踪** | Winston + 结构化日志 |

---

### 3.4 部署要求

| 部署方式 | 适用场景 | 实现方式 |
|----------|----------|----------|
| **单文件可执行** | 本地使用 | pkg / nexe |
| **Docker 镜像** | 服务器部署 | Dockerfile |
| **Serverless** | 无服务器 | Vercel Edge Function |
| **桌面应用** | 跨平台 GUI | Tauri |

---

## 四、技术约束

### 4.1 技术栈限制

| 类别 | 技术选型 | 原因 |
|------|----------|------|
| **运行时** | Node.js 20+ | 原生 fetch + AsyncGenerator |
| **语言** | TypeScript 5.x | 类型安全 + 现代语法 |
| **包管理** | pnpm | 更快 + 更严格 |
| **测试框架** | Vitest | 更快 + Vite 集成 |
| **浏览器** | Playwright | 更稳定 + 更快 |

---

### 4.2 兼容性要求

| 平台 | 最低版本 | 备注 |
|------|----------|------|
| **Node.js** | 20.0.0 | 需要原生 fetch |
| **操作系统** | Windows 10 / macOS 12 / Ubuntu 20.04 | - |
| **浏览器** | Chrome 120+ / Edge 120+ | Playwright 依赖 |

---

## 五、验收标准

### 5.1 功能验收

- [ ] 所有 MVP 功能（F1-F5）通过集成测试
- [ ] 工具调用成功率 >95%
- [ ] 记忆搜索准确率 >90%
- [ ] 浏览器自动化稳定性 >95%

---

### 5.2 性能验收

- [ ] Agent 响应延迟 <200ms
- [ ] 记忆搜索延迟 <50ms
- [ ] 并发 100 用户无崩溃

---

### 5.3 安全验收

- [ ] 代码沙箱通过渗透测试
- [ ] 无敏感信息泄露
- [ ] 所有输入通过 Zod 校验

---

### 5.4 文档验收

- [ ] API Reference 完整
- [ ] 迁移指南（Python → TypeScript）
- [ ] 部署文档（Docker / Serverless）

---

## 六、风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **VM2 沙箱逃逸** | 高 | 低 | 定期更新 + 备选方案（isolated-vm） |
| **Playwright 不稳定** | 中 | 中 | 自动重试 + 降级到 Puppeteer |
| **SQLite 性能瓶颈** | 中 | 低 | 分片 + 索引优化 |
| **LLM API 限流** | 高 | 中 | 指数退避 + 本地模型备选 |
| **记忆系统迁移** | 低 | 高 | 提供迁移脚本 |

---

## 七、里程碑

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| **Phase 1** | Week 1-2 | 核心框架（Agent Loop + LLM Client） |
| **Phase 2** | Week 3-4 | 工具系统（9 个工具 + 分发器） |
| **Phase 3** | Week 5-6 | 记忆系统（SQLite + FTS5） |
| **Phase 4** | Week 7-8 | 浏览器自动化（Playwright） |
| **Phase 5** | Week 9-10 | 前端 + 部署（CLI / Web / Docker） |
| **Phase 6** | Week 11-12 | 测试 + 文档 + 发布 |

---

## 八、参考资料

- [Python 原版代码](../original/)
- [技术报告](../original/assets/GenericAgent_Technical_Report.pdf)
- [重构计划](./refactor-plan.md)
- [问题分析](./issues-analysis.md)
