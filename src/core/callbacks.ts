/**
 * 回调系统
 * 对应 Python 的 BaseHandler 回调方法
 */

import type { ToolCall, ToolResult, ToolOutcome, LLMResponse } from './types'

/**
 * Agent 回调接口
 */
export interface AgentCallbacks {
  /**
   * 工具执行前回调
   * 对应 Python 的 tool_before_callback
   */
  onToolBefore?(
    toolName: string,
    args: Record<string, unknown>,
    response: LLMResponse
  ): Promise<void> | void

  /**
   * 工具执行后回调
   * 对应 Python 的 tool_after_callback
   */
  onToolAfter?(
    toolName: string,
    args: Record<string, unknown>,
    response: LLMResponse,
    outcome: ToolOutcome
  ): Promise<void> | void

  /**
   * 每轮结束回调
   * 对应 Python 的 turn_end_callback
   * 
   * @returns 修改后的 next_prompt（如果需要修改）
   */
  onTurnEnd?(
    response: LLMResponse,
    toolCalls: ToolCall[],
    toolResults: ToolResult[],
    turn: number,
    nextPrompt: string,
    exitReason: Record<string, unknown>
  ): Promise<string | null> | string | null

  /**
   * Agent 启动回调
   */
  onStart?(userInput: string): Promise<void> | void

  /**
   * Agent 结束回调
   */
  onEnd?(
    exitReason: string,
    totalTurns: number,
    toolCallsCount: number
  ): Promise<void> | void
}

/**
 * 默认回调实现（空操作）
 */
export class DefaultCallbacks implements AgentCallbacks {
  async onToolBefore(
    _toolName: string,
    _args: Record<string, unknown>,
    _response: LLMResponse
  ): Promise<void> {
    // 默认不做任何操作
  }

  async onToolAfter(
    _toolName: string,
    _args: Record<string, unknown>,
    _response: LLMResponse,
    _outcome: ToolOutcome
  ): Promise<void> {
    // 默认不做任何操作
  }

  async onTurnEnd(
    _response: LLMResponse,
    _toolCalls: ToolCall[],
    _toolResults: ToolResult[],
    _turn: number,
    nextPrompt: string,
    _exitReason: Record<string, unknown>
  ): Promise<string | null> {
    // 默认返回原始 next_prompt
    return nextPrompt
  }

  async onStart(_userInput: string): Promise<void> {
    // 默认不做任何操作
  }

  async onEnd(
    _exitReason: string,
    _totalTurns: number,
    _toolCallsCount: number
  ): Promise<void> {
    // 默认不做任何操作
  }
}

/**
 * 日志回调实现
 */
export class LoggingCallbacks extends DefaultCallbacks {
  override async onToolBefore(
    toolName: string,
    _args: Record<string, unknown>
  ): Promise<void> {
    console.log(`[Callback] Tool before: ${toolName}`)
  }

  override async onToolAfter(
    toolName: string,
    _args: Record<string, unknown>,
    _response: LLMResponse,
    outcome: ToolOutcome
  ): Promise<void> {
    console.log(`[Callback] Tool after: ${toolName}, success: ${outcome.is_success}`)
  }

  override async onTurnEnd(
    _response: LLMResponse,
    toolCalls: ToolCall[],
    _toolResults: ToolResult[],
    turn: number,
    nextPrompt: string
  ): Promise<string> {
    console.log(`[Callback] Turn ${turn} ended, ${toolCalls.length} tool calls`)
    return nextPrompt
  }

  override async onStart(userInput: string): Promise<void> {
    console.log(`[Callback] Agent started with input: ${userInput.slice(0, 50)}...`)
  }

  override async onEnd(
    exitReason: string,
    totalTurns: number,
    toolCallsCount: number
  ): Promise<void> {
    console.log(
      `[Callback] Agent ended: ${exitReason}, ${totalTurns} turns, ${toolCallsCount} tool calls`
    )
  }
}
