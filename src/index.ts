/**
 * GenericAgent TypeScript
 * 主入口文件
 */

// 核心模块
export { LLMClient } from './core/llm-client'
export { ToolDispatcher } from './core/tool-dispatcher'
export { agentRunnerLoop, type WorkingMemory, type AgentLoopConfig } from './core/agent-loop'
export { Session, SessionManager } from './core/session'
export {
  DefaultCallbacks,
  LoggingCallbacks,
  type AgentCallbacks,
} from './core/callbacks'
export {
  enterPlanMode,
  exitPlanMode,
  inPlanMode,
  checkPlanCompletion,
} from './core/plan-mode'

// 记忆系统
export { MemoryStorage } from './memory/storage'

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
  MemoryLayer,
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
export {
  BaseTool,
  getDefaultTools,
  FileReadTool,
  FileWriteTool,
  FilePatchTool,
  AskUserTool,
  CodeRunTool,
  WebScanTool,
  WebControlTool,
  WebExecuteJsTool,
  MemSearchTool,
  MemWriteTool,
  ReflectTool,
  UpdateWorkingCheckpointTool,
  StartLongTermUpdateTool,
} from './tools'

// 辅助函数
export {
  expandFileRefs,
  extractCodeBlock,
  smartFormat,
  formatError,
  consumeFile,
  logMemoryAccess,
  getGlobalMemory,
} from './utils/helpers'

// 工具函数
export { loadConfig, getApiKey } from './utils/config'
