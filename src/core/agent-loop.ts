/**
 * Agent 执行循环
 */

import type { LLMClient } from './llm-client'
import type { ToolDispatcher } from './tool-dispatcher'
import type { AgentCallbacks } from './callbacks'
import type { Session } from './session'
import type {
  Message,
  StreamChunk,
  ExitReason,
  AgentResult,
  ToolResult,
  LLMResponse,
} from './types'
import { AgentError } from './types'
import { DefaultCallbacks } from './callbacks'

/**
 * Agent 循环配置
 */
export interface AgentLoopConfig {
  /** 最大轮次 */
  maxTurns: number
  /** 系统提示词 */
  systemPrompt: string
  /** 是否详细输出 */
  verbose?: boolean
  /** 上下文窗口大小（字符数） */
  contextWindow?: number
  /** 回调函数 */
  callbacks?: AgentCallbacks
  /** Session（可选，用于持久化） */
  session?: Session
}

/**
 * Agent 执行循环
 * 
 * 对应 Python 的 agent_runner_loop
 */
export async function* agentRunnerLoop(
  client: LLMClient,
  dispatcher: ToolDispatcher,
  userInput: string,
  config: AgentLoopConfig
): AsyncGenerator<StreamChunk, AgentResult> {
  // 初始化回调
  const callbacks = config.callbacks || new DefaultCallbacks()

  // 触发启动回调
  await callbacks.onStart?.(userInput)

  // 初始化消息历史
  let messages: Message[]

  if (config.session) {
    // 使用 Session 管理消息
    messages = config.session.getMessages()
    
    // 如果是新 Session，添加系统消息和用户输入
    if (messages.length === 0) {
      messages.push({
        role: 'system',
        content: config.systemPrompt,
      })
      messages.push({
        role: 'user',
        content: userInput,
      })
      config.session.addMessages(messages)
    }
  } else {
    // 不使用 Session，直接创建消息数组
    messages = [
      {
        role: 'system',
        content: config.systemPrompt,
      },
      {
        role: 'user',
        content: userInput,
      },
    ]
  }

  let turn = 0
  let totalToolCalls = 0
  let exitReason: ExitReason = 'end_turn'
  let finalMessage = ''
  let lastResponse: LLMResponse | null = null
  const verbose = config.verbose ?? true

  try {
    while (turn < config.maxTurns) {
      turn++

      // Session 轮次计数
      config.session?.incrementTurn()

      // 输出轮次信息
      const md = verbose ? '**' : ''
      yield {
        type: 'text',
        content: `${md}LLM Running (Turn ${turn}) ...${md}\n\n`,
      }

      // 每 10 轮重置工具描述（避免上下文过大）
      if (turn % 10 === 0) {
        // TODO: 实现 client.resetTools()
      }

      // 调用 LLM
      const toolSchemas = dispatcher.getSchemas()
      let currentResponse = ''
      const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = []

      // 流式获取 LLM 响应
      for await (const chunk of client.chat(messages, toolSchemas, config.systemPrompt)) {
        if (chunk.type === 'text') {
          currentResponse += chunk.content
          if (verbose) {
            yield chunk
          }
        } else if (chunk.type === 'tool_call') {
          toolCalls.push(chunk.tool_call)
        } else if (chunk.type === 'done') {
          const { response } = chunk
          lastResponse = response

          if (verbose) {
            yield { type: 'text', content: '\n\n' }
          }

          // 添加 assistant 消息到历史
          const assistantMsg: Message = {
            role: 'assistant',
            content: response.content,
          }
          messages.push(assistantMsg)
          config.session?.addMessage(assistantMsg)

          finalMessage = response.content

          // 处理工具调用
          const actualToolCalls = response.tool_calls.length > 0
            ? response.tool_calls
            : [{ id: 'no_tool', name: 'no_tool', args: {} }]

          const toolResults: ToolResult[] = []
          const nextPrompts = new Set<string>()
          let shouldBreak = false
          let taskDone = false

          for (let ii = 0; ii < actualToolCalls.length; ii++) {
            const toolCall = actualToolCalls[ii]!
            const { id: tid, name: toolName, args } = toolCall

            if (toolName === 'no_tool') {
              // 没有工具调用，LLM 主动结束
              continue
            }

            totalToolCalls++

            // 输出工具调用信息
            if (verbose) {
              yield {
                type: 'text',
                content: `🛠️ Tool: \`${toolName}\`  📥 args:\n\`\`\`\`text\n${JSON.stringify(args, null, 2)}\n\`\`\`\`\n`,
              }
            } else {
              yield {
                type: 'text',
                content: `🛠️ ${toolName}(${compactToolArgs(toolName, args)})\n\n\n`,
              }
            }

            try {
              // 工具执行前回调
              await callbacks.onToolBefore?.(toolName, args, response)

              // 执行工具
              if (verbose) {
                yield { type: 'text', content: '`````\n' }
              }

              const outcome = await dispatcher.dispatch(toolName, args)

              if (verbose) {
                yield { type: 'text', content: '`````\n' }
              }

              // 工具执行后回调
              await callbacks.onToolAfter?.(toolName, args, response, outcome)

              // 检查退出条件
              if (outcome.should_exit) {
                exitReason = 'should_exit'
                shouldBreak = true
                break
              }

              if (!outcome.next_prompt) {
                // next_prompt 为 null，表示任务完成
                exitReason = 'task_done'
                taskDone = true
                break
              }

              // 添加工具结果
              if (outcome.data !== null && toolName !== 'no_tool') {
                const toolResult = dispatcher.formatToolResult(tid, toolName, outcome)
                toolResults.push(toolResult)
              }

              nextPrompts.add(outcome.next_prompt)
            } catch (error) {
              // 工具执行失败
              const errorMsg = error instanceof Error ? error.message : String(error)
              yield {
                type: 'text',
                content: `\n[Tool Error: ${toolName}] ${errorMsg}\n`,
              }

              nextPrompts.add(`工具 ${toolName} 执行失败: ${errorMsg}`)
            }
          }

          // 检查是否应该退出
          if (shouldBreak || taskDone || nextPrompts.size === 0) {
            // 触发轮次结束回调
            await callbacks.onTurnEnd?.(
              response,
              actualToolCalls,
              toolResults,
              turn,
              '',
              { result: exitReason }
            )

            // 触发结束回调
            await callbacks.onEnd?.(exitReason, turn, totalToolCalls)

            return {
              exit_reason: exitReason,
              final_message: finalMessage,
              total_turns: turn,
              tool_calls_count: totalToolCalls,
            }
          }

          // 构建下一轮消息
          let nextPrompt = Array.from(nextPrompts).join('\n')

          // 触发轮次结束回调（可能修改 next_prompt）
          const modifiedPrompt = await callbacks.onTurnEnd?.(
            response,
            actualToolCalls,
            toolResults,
            turn,
            nextPrompt,
            {}
          )

          if (modifiedPrompt !== null && modifiedPrompt !== undefined) {
            nextPrompt = modifiedPrompt
          }

          const userMsg: Message = {
            role: 'user',
            content: nextPrompt,
            tool_results: toolResults,
          }
          messages.push(userMsg)
          config.session?.addMessage(userMsg)

          // 修剪历史消息（避免上下文过大）
          if (config.contextWindow) {
            if (config.session) {
              config.session.trimHistory(config.contextWindow)
              messages = config.session.getMessages()
            } else {
              trimMessagesHistory(messages, config.contextWindow)
            }
          }
        }
      }
    }

    // 达到最大轮次
    exitReason = 'max_turns'

    // 触发结束回调
    await callbacks.onEnd?.(exitReason, turn, totalToolCalls)

    return {
      exit_reason: exitReason,
      final_message: finalMessage,
      total_turns: turn,
      tool_calls_count: totalToolCalls,
    }
  } catch (error) {
    // 错误退出
    exitReason = 'error'

    // 触发结束回调
    await callbacks.onEnd?.(exitReason, turn, totalToolCalls)

    throw new AgentError(
      `Agent loop failed: ${error instanceof Error ? error.message : String(error)}`,
      'AGENT_LOOP_ERROR',
      error
    )
  }
}

/**
 * 压缩工具参数显示（对应 Python 的 _compact_tool_args）
 */
function compactToolArgs(name: string, args: Record<string, unknown>): string {
  const a = { ...args }
  delete a._index

  // 简化路径显示
  if ('path' in a && typeof a.path === 'string') {
    a.path = a.path.split(/[/\\]/).pop() || a.path
  }

  // 特殊处理某些工具
  if (name === 'ask_user') {
    const q = String(a.question || '')
    const cs = (a.candidates as string[]) || []
    if (cs.length > 0) {
      return q + '\ncandidates:\n' + cs.map((c) => `- ${c}`).join('\n')
    }
    return q
  }

  const s = JSON.stringify(a, null, 0)
  return s.length > 120 ? s.slice(0, 120) + '...' : s
}

/**
 * 修剪消息历史（对应 Python 的 trim_messages_history）
 */
function trimMessagesHistory(messages: Message[], contextWindow: number): void {
  const cost = messages.reduce((sum, m) => sum + JSON.stringify(m).length, 0)

  console.log(`[Debug] Current context: ${cost} chars, ${messages.length} messages.`)

  if (cost > contextWindow * 3) {
    const target = contextWindow * 3 * 0.6

    // 保留系统消息和最近的消息
    while (messages.length > 5 && cost > target) {
      // 移除最旧的非系统消息
      const firstNonSystem = messages.findIndex((m) => m.role !== 'system')
      if (firstNonSystem > 0) {
        messages.splice(firstNonSystem, 1)
      } else {
        break
      }
    }

    const newCost = messages.reduce((sum, m) => sum + JSON.stringify(m).length, 0)
    console.log(`[Debug] Trimmed context, current: ${newCost} chars, ${messages.length} messages.`)
  }
}
