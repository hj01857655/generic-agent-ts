/**
 * GenericAgent TypeScript
 * 主入口文件
 */

// 核心模块
export { LLMClient } from './core/llm-client'
export { ToolDispatcher } from './core/tool-dispatcher'
export { agentRunnerLoop } from './core/agent-loop'

// 类型定义
export type {
  Message,
  MessageRole,
  ToolCall,
  ToolResult,
  ToolOutcome,
  ToolSchema,
  ToolHandler,
  LLMResponse,
  StreamChunk,
  AgentConfig,
  AgentResult,
  ExitReason,
  MemoryEntry,
  Skill,
} from './core/types'

export {
  TrustLevel,
  AgentError,
  ToolError,
  LLMError,
  UnknownToolError,
} from './core/types'

// 工具
export { BaseTool, getDefaultTools } from './tools'

// 工具函数
export { loadConfig, getApiKey } from './utils/config'
