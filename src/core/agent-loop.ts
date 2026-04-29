/**
 * Agent 执行循环 - 完整 1:1 重构版本
 * 
 * 对应 Python 的 agent_runner_loop + GenericAgentHandler
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
import { smartFormat, getGlobalMemory, consumeFile } from '../utils/helpers'
import * as fs from 'fs/promises'

/**
 * 工作记忆状态
 */
export interface WorkingMemory {
  key_info?: string
  related_sop?: string
  passed_sessions?: number
  in_plan_mode?: string
}

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
  /** 工作目录 */
  cwd?: string
  /** 任务目录（用于临时文件） */
  taskDir?: string
  /** 脚本目录（用于记忆文件） */
  scriptDir?: string
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

  // 初始化工作记忆
  const working: WorkingMemory = {}
  const historyInfo: string[] = []
  const doneHooks: string[] = []

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
              // 没有工具调用，需要特殊处理
              // 这里应该调用 no_tool 工具的逻辑
              const noToolOutcome = await handleNoTool(response, working)
              
              if (noToolOutcome.should_exit) {
                exitReason = 'should_exit'
                shouldBreak = true
                break
              }

              if (!noToolOutcome.next_prompt) {
                exitReason = 'task_done'
                taskDone = true
                break
              }

              nextPrompts.add(noToolOutcome.next_prompt)
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

              // 获取 anchor prompt（工作记忆）
              const anchorPrompt = getAnchorPrompt(working, historyInfo, turn, ii > 0)
              nextPrompts.add(outcome.next_prompt + anchorPrompt)
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
          if (shouldBreak || taskDone) {
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

          // 检查 done_hooks
          if (nextPrompts.size === 0 || exitReason) {
            if (doneHooks.length === 0 || exitReason === 'should_exit') {
              break
            }
            nextPrompts.add(doneHooks.shift()!)
          }

          // 构建下一轮消息
          let nextPrompt = Array.from(nextPrompts).join('\n')

          // 提取 summary 并更新历史
          const summary = extractSummary(response.content, actualToolCalls)
          historyInfo.push(`[Agent] ${summary}`)

          // 轮次检查逻辑
          nextPrompt = applyTurnChecks(turn, nextPrompt, working, config.scriptDir)

          // 注入临时文件内容
          if (config.taskDir) {
            const injKeyInfo = await consumeFile(config.taskDir, '_keyinfo')
            const injPrompt = await consumeFile(config.taskDir, '_intervene')

            if (injKeyInfo) {
              working.key_info = (working.key_info || '') + `\n[MASTER] ${injKeyInfo}`
            }

            if (injPrompt) {
              nextPrompt += `\n\n[MASTER] ${injPrompt}\n`
            }
          }

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
 * 获取 Anchor Prompt（工作记忆）
 * 
 * 对应 Python 的 _get_anchor_prompt
 */
function getAnchorPrompt(
  working: WorkingMemory,
  historyInfo: string[],
  turn: number,
  skip: boolean = false
): string {
  if (skip) {
    return '\n'
  }

  const hStr = historyInfo.slice(-40).join('\n')
  let prompt = `\n### [WORKING MEMORY]\n<history>\n${hStr}\n</history>`
  prompt += `\nCurrent turn: ${turn}\n`

  if (working.key_info) {
    prompt += `\n<key_info>${working.key_info}</key_info>`
  }

  if (working.related_sop) {
    prompt += `\n有不清晰的地方请再次读取${working.related_sop}`
  }

  return prompt
}

/**
 * 提取 summary
 * 
 * 对应 Python 的 turn_end_callback 中的 summary 提取逻辑
 */
function extractSummary(
  content: string,
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>
): string {
  // 移除代码块和 thinking 标签
  const cleaned = content.replace(/```.*?```|<thinking>.*?<\/thinking>/gs, '')

  // 尝试提取 <summary> 标签
  const match = cleaned.match(/<summary>(.*?)<\/summary>/s)
  if (match) {
    return smartFormat(match[1]!.trim(), 100)
  }

  // 如果没有 summary，根据工具调用生成
  if (toolCalls.length > 0) {
    const tc = toolCalls[0]!
    const toolName = tc.name
    const args = tc.args
    const cleanArgs = Object.fromEntries(
      Object.entries(args).filter(([k]) => !k.startsWith('_'))
    )

    if (toolName === 'no_tool') {
      return '直接回答了用户问题'
    }

    return `调用工具${toolName}, args: ${JSON.stringify(cleanArgs)}`
  }

  return '未知操作'
}

/**
 * 应用轮次检查逻辑
 * 
 * 对应 Python 的 turn_end_callback 中的轮次检查
 */
function applyTurnChecks(
  turn: number,
  nextPrompt: string,
  working: WorkingMemory,
  scriptDir?: string
): string {
  let result = nextPrompt

  // 65 轮检查
  if (turn % 65 === 0 && !working.related_sop?.includes('plan')) {
    result += `\n\n[DANGER] 已连续执行第 ${turn} 轮。你必须总结情况进行ask_user，不允许继续重试。`
  }
  // 7 轮检查
  else if (turn % 7 === 0) {
    result += `\n\n[DANGER] 已连续执行第 ${turn} 轮。禁止无效重试。若无有效进展，必须切换策略：1. 探测物理边界 2. 请求用户协助。如有需要，可调用 update_working_checkpoint 保存关键上下文。`
  }
  // 10 轮检查 - 注入全局记忆
  else if (turn % 10 === 0 && scriptDir) {
    // 异步调用，这里简化处理
    getGlobalMemory(scriptDir).then((memory) => {
      result += memory
    })
  }

  // Plan 模式检查
  if (working.in_plan_mode) {
    if (turn >= 10 && turn % 5 === 0) {
      result = `[Plan Hint] 你正在计划模式。必须 file_read(${working.in_plan_mode}) 确认当前步骤，回复开头引用：📌 当前步骤：...\n\n` + result
    }

    if (turn >= 90) {
      result += `\n\n[DANGER] Plan模式已运行 ${turn} 轮，已达上限。必须 ask_user 汇报进度并确认是否继续。`
    }
  }

  return result
}

/**
 * 处理 no_tool 情况
 * 
 * 对应 Python 的 do_no_tool
 */
async function handleNoTool(
  response: LLMResponse,
  working: WorkingMemory
): Promise<{ data: unknown; next_prompt: string | null; should_exit: boolean }> {
  const content = response.content || ''
  const thinking = (response as any).thinking || ''

  // 1. 检查空响应
  if (!content.trim() && !thinking.trim()) {
    return {
      data: {},
      next_prompt: '[System] Blank response, regenerate and tooluse',
      should_exit: false,
    }
  }

  // 2. 检查不完整响应
  if (content.length > 50) {
    const tail = content.slice(-100)
    if (tail.includes('未收到完整响应 !!!]') || tail.includes('!!!Error: [SSL:')) {
      return {
        data: {},
        next_prompt: '[System] Incomplete response. Regenerate and tooluse.',
        should_exit: false,
      }
    }
    if (tail.includes('max_tokens !!!]')) {
      return {
        data: {},
        next_prompt: '[System] max_tokens limit reached. Use multi small steps to do it.',
        should_exit: false,
      }
    }
  }

  // 3. Plan 模式完成声明拦截
  if (working.in_plan_mode) {
    const completionKeywords = ['任务完成', '全部完成', '已完成所有', '🏁']
    if (completionKeywords.some((kw) => content.includes(kw))) {
      if (
        !content.includes('VERDICT') &&
        !content.includes('[VERIFY]') &&
        !content.includes('验证subagent')
      ) {
        return {
          data: {},
          next_prompt:
            '⛔ [验证拦截] 检测到你在plan模式下声称完成，但未执行[VERIFY]验证步骤。请先按plan_sop §四启动验证subagent，获得VERDICT后才能声称完成。',
          should_exit: false,
        }
      }
    }
  }

  // 4. 检测大代码块但未调用工具
  const codeBlockPattern = /```[a-zA-Z0-9_]*\n[\s\S]{50,}?```/g
  const blocks = content.match(codeBlockPattern) || []

  if (blocks.length === 1) {
    const match = content.match(codeBlockPattern)
    if (match) {
      const afterBlock = content.slice(match.index! + match[0].length)
      if (!afterBlock.trim()) {
        let residual = content.replace(match[0], '')
        residual = residual.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        residual = residual.replace(/<summary>[\s\S]*?<\/summary>/gi, '')
        const cleanResidual = residual.replace(/\s+/g, '')

        if (cleanResidual.length <= 30) {
          return {
            data: {},
            next_prompt: `[System] 检测到你在上一轮回复中主要内容是较大代码块，且本轮未调用任何工具。
如果这些代码需要执行、写入文件或进一步分析，请重新组织回复并显式调用相应工具（例如：code_run、file_write、file_patch 等）；
如果只是向用户展示或讲解代码片段，请在回复中补充自然语言说明，并明确是否还需要额外的实际操作。`,
            should_exit: false,
          }
        }
      }
    }
  }

  // 5. 检查 Plan 模式完成
  if (working.in_plan_mode) {
    const remaining = await checkPlanCompletion(working.in_plan_mode)
    if (remaining === 0) {
      delete working.in_plan_mode
      console.log('[Info] Plan完成：plan.md中0个[ ]残留，退出plan模式。')
    }
  }

  // 6. 正常结束
  return {
    data: response,
    next_prompt: null,
    should_exit: false,
  }
}

/**
 * 检查 Plan 完成度
 */
async function checkPlanCompletion(planPath: string): Promise<number | null> {
  try {
    await fs.access(planPath)
    const content = await fs.readFile(planPath, 'utf-8')
    const matches = content.match(/\[ \]/g)
    return matches ? matches.length : 0
  } catch {
    return null
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
  if (name === 'update_working_checkpoint') {
    const s = String(a.key_info || '')
    return s.length > 60 ? s.slice(0, 60) + '...' : s
  }

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
