/**
 * 核心类型定义
 */

import type { z } from 'zod'

// ============================================================================
// LLM 相关类型
// ============================================================================

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * 信任级别
 */
export enum TrustLevel {
  /** 系统消息（完全可信） */
  SYSTEM = 'system',
  /** 用户输入（可信） */
  USER = 'user',
  /** 工具输出 - 安全（本地文件读取等） */
  TOOL_SAFE = 'tool_safe',
  /** 工具输出 - 不可信（网络请求、代码执行等） */
  TOOL_UNTRUSTED = 'tool_untrusted',
}

/**
 * 工具调用结果
 */
export interface ToolResult {
  /** 工具调用 ID */
  tool_use_id: string
  /** 工具名称 */
  tool_name: string
  /** 返回内容 */
  content: string
  /** 信任级别 */
  trust_level: TrustLevel
  /** 是否成功 */
  is_success: boolean
  /** 错误信息（如果失败） */
  error?: string
}

/**
 * 消息内容
 */
export interface Message {
  /** 角色 */
  role: MessageRole
  /** 内容 */
  content: string
  /** 工具调用结果（仅 user 角色） */
  tool_results?: ToolResult[]
  /** 信任级别 */
  trust_level?: TrustLevel
}

/**
 * 工具调用
 */
export interface ToolCall {
  /** 工具调用 ID */
  id: string
  /** 工具名称 */
  name: string
  /** 参数 */
  args: Record<string, unknown>
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  /** 文本内容 */
  content: string
  /** 工具调用 */
  tool_calls: ToolCall[]
  /** 是否结束 */
  stop_reason: 'end_turn' | 'max_tokens' | 'tool_use' | null
}

/**
 * 流式响应块
 */
export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; tool_call: ToolCall }
  | { type: 'done'; response: LLMResponse }

// ============================================================================
// 工具相关类型
// ============================================================================

/**
 * 工具执行结果
 */
export interface ToolOutcome {
  /** 返回数据 */
  data: unknown
  /** 下一轮提示词 */
  next_prompt: string
  /** 信任级别 */
  trust_level: TrustLevel
  /** 是否成功 */
  is_success: boolean
  /** 错误信息 */
  error?: string
}

/**
 * 工具 Schema
 */
export interface ToolSchema {
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 参数 Schema（Zod） */
  parameters: z.ZodObject<any>
}

/**
 * 工具处理器
 */
export type ToolHandler<T = any> = (args: T) => Promise<ToolOutcome>

// ============================================================================
// Agent 相关类型
// ============================================================================

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** LLM 提供商 */
  provider: 'claude' | 'openai' | 'ollama'
  /** 模型名称 */
  model: string
  /** 最大轮次 */
  max_turns: number
  /** 上下文窗口大小 */
  context_window: number
  /** 系统提示词 */
  system_prompt: string
  /** 数据目录 */
  data_dir: string
}

/**
 * Agent 退出原因
 */
export type ExitReason =
  | 'end_turn' // LLM 主动结束
  | 'max_turns' // 达到最大轮次
  | 'user_interrupt' // 用户中断
  | 'error' // 错误

/**
 * Agent 执行结果
 */
export interface AgentResult {
  /** 退出原因 */
  exit_reason: ExitReason
  /** 最终消息 */
  final_message: string
  /** 总轮次 */
  total_turns: number
  /** 工具调用次数 */
  tool_calls_count: number
}

// ============================================================================
// 记忆相关类型
// ============================================================================

/**
 * 记忆层级
 */
export type MemoryLayer = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'

/**
 * 记忆条目
 */
export interface MemoryEntry {
  /** ID */
  id: string
  /** 层级 */
  layer: MemoryLayer
  /** 名称 */
  name: string
  /** 内容 */
  content: string
  /** 标签 */
  tags: string[]
  /** 元数据 */
  metadata: Record<string, unknown>
  /** 创建时间 */
  created_at: number
  /** 更新时间 */
  updated_at: number
}

/**
 * 技能（L3 层）
 */
export interface Skill extends MemoryEntry {
  layer: 'L3'
  /** 技能描述 */
  description: string
  /** 使用次数 */
  usage_count: number
  /** 成功率 */
  success_rate: number
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * Agent 错误基类
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AgentError'
  }
}

/**
 * 工具错误
 */
export class ToolError extends AgentError {
  constructor(message: string, public tool_name: string, details?: unknown) {
    super(message, 'TOOL_ERROR', details)
    this.name = 'ToolError'
  }
}

/**
 * LLM 错误
 */
export class LLMError extends AgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'LLM_ERROR', details)
    this.name = 'LLMError'
  }
}

/**
 * 未知工具错误
 */
export class UnknownToolError extends ToolError {
  constructor(tool_name: string) {
    super(`Unknown tool: ${tool_name}`, tool_name)
    this.name = 'UnknownToolError'
  }
}
