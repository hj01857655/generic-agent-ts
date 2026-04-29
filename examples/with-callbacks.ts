/**
 * 使用回调系统的示例
 */

import { LLMClient } from '../src/core/llm-client'
import { ToolDispatcher } from '../src/core/tool-dispatcher'
import { agentRunnerLoop } from '../src/core/agent-loop'
import { LoggingCallbacks, type AgentCallbacks } from '../src/core/callbacks'
import { getDefaultTools } from '../src/tools'
import { loadConfig, getApiKey } from '../src/utils/config'

/**
 * 自定义回调：记录工具使用统计
 */
class StatsCallbacks extends LoggingCallbacks {
  private toolStats: Map<string, number> = new Map()

  override async onToolAfter(
    toolName: string,
    args: Record<string, unknown>,
    response: any,
    outcome: any
  ): Promise<void> {
    // 调用父类方法
    await super.onToolAfter(toolName, args, response, outcome)

    // 统计工具使用次数
    const count = this.toolStats.get(toolName) || 0
    this.toolStats.set(toolName, count + 1)
  }

  override async onEnd(
    exitReason: string,
    totalTurns: number,
    toolCallsCount: number
  ): Promise<void> {
    await super.onEnd(exitReason, totalTurns, toolCallsCount)

    // 输出统计信息
    console.log('\n📊 工具使用统计:')
    for (const [tool, count] of this.toolStats.entries()) {
      console.log(`   ${tool}: ${count} 次`)
    }
  }
}

async function main() {
  // 加载配置
  const config = loadConfig()

  // 创建 LLM 客户端
  const client = new LLMClient({
    provider: config.provider,
    model: config.model,
    apiKey: config.provider !== 'ollama' ? getApiKey(config.provider) : undefined,
  })

  // 创建工具分发器
  const dispatcher = new ToolDispatcher()
  const tools = getDefaultTools()
  dispatcher.registerAll(tools)

  // 创建自定义回调
  const callbacks = new StatsCallbacks()

  // 用户输入
  const userInput = process.argv.slice(2).join(' ') || '读取 package.json 文件'

  console.log(`💬 User: ${userInput}\n`)
  console.log('🤖 Assistant:\n')

  try {
    // 执行 Agent 循环
    const stream = agentRunnerLoop(client, dispatcher, userInput, {
      maxTurns: config.max_turns,
      systemPrompt: config.system_prompt,
      verbose: true,
      contextWindow: config.context_window,
      callbacks, // 传入回调
    })

    // 流式输出
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        process.stdout.write(chunk.content)
      }
    }

    console.log('\n\n✅ 任务完成')
  } catch (error) {
    console.error('\n\n❌ 错误:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
