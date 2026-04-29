/**
 * Agent 执行循环
 */

import type { LLMClient } from './llm-client'
import type { ToolDispatcher } from './tool-dispatcher'
import type {
  Message,
  StreamChunk,
  ExitReason,
  AgentResult,
  ToolResult,
} from './types'
import { AgentError } from './types'

/**
 * Agent 循环配置
 */
export interface AgentLoopConfig {
  /** 最大轮次 */
  maxTurns: number
  /** 系统提示词 */
  systemPrompt: string
  /** 是否启用流式输出 */
  streaming?: boolean
}

/**
 * Agent 执行循环
 */
export async function* agentRunnerLoop(
  client: LLMClient,
  dispatcher: ToolDispatcher,
  userInput: string,
  config: AgentLoopConfig
): AsyncGenerator<StreamChunk, AgentResult> {
  const messages: Message[] = [
    {
      role: 'user',
      content: userInput,
    },
  ]

  let turn = 0
  let totalToolCalls = 0
  let exitReason: ExitReason = 'end_turn'
  let finalMessage = ''

  try {
    while (turn < config.maxTurns) {
      turn++

      // 调用 LLM
      const toolSchemas = dispatcher.getSchemas()
      let currentResponse = ''
      const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = []

      for await (const chunk of client.chat(messages, toolSchemas, config.systemPrompt)) {
        // 流式输出
        yield chunk

        if (chunk.type === 'text') {
          currentResponse += chunk.content
        } else if (chunk.type === 'tool_call') {
          toolCalls.push(chunk.tool_call)
        } else if (chunk.type === 'done') {
          // LLM 响应完成
          const { response } = chunk

          // 添加 assistant 消息
          messages.push({
            role: 'assistant',
            content: response.content,
          })

          finalMessage = response.content

          // 检查是否需要调用工具
          if (response.tool_calls.length === 0) {
            // 没有工具调用，结束循环
            exitReason = response.stop_reason === 'end_turn' ? 'end_turn' : 'max_tokens'
            return {
              exit_reason: exitReason,
              final_message: finalMessage,
              total_turns: turn,
              tool_calls_count: totalToolCalls,
            }
          }

          // 执行工具调用
          const toolResults: ToolResult[] = []

          for (const toolCall of response.tool_calls) {
            totalToolCalls++

            try {
              // 分发工具调用
              const outcome = await dispatcher.dispatch(toolCall.name, toolCall.args)

              // 格式化工具结果
              const toolResult = dispatcher.formatToolResult(
                toolCall.id,
                toolCall.name,
                outcome
              )

              toolResults.push(toolResult)

              // 流式输出工具结果
              yield {
                type: 'text',
                content: `\n[Tool: ${toolCall.name}] ${outcome.next_prompt}\n`,
              }
            } catch (error) {
              // 工具执行失败
              const errorMsg = error instanceof Error ? error.message : String(error)
              toolResults.push({
                tool_use_id: toolCall.id,
                tool_name: toolCall.name,
                content: `Error: ${errorMsg}`,
                trust_level: 'tool_safe' as any,
                is_success: false,
                error: errorMsg,
              })

              yield {
                type: 'text',
                content: `\n[Tool Error: ${toolCall.name}] ${errorMsg}\n`,
              }
            }
          }

          // 构建下一轮提示词
          const nextPrompt = toolResults
            .map((tr) => tr.content)
            .join('\n\n')

          // 添加工具结果消息
          messages.push({
            role: 'user',
            content: nextPrompt,
            tool_results: toolResults,
          })
        }
      }
    }

    // 达到最大轮次
    exitReason = 'max_turns'
    return {
      exit_reason: exitReason,
      final_message: finalMessage,
      total_turns: turn,
      tool_calls_count: totalToolCalls,
    }
  } catch (error) {
    // 错误退出
    exitReason = 'error'
    throw new AgentError(
      `Agent loop failed: ${error instanceof Error ? error.message : String(error)}`,
      'AGENT_LOOP_ERROR',
      error
    )
  }
}
