#!/usr/bin/env node
/**
 * CLI 入口
 */

import { LLMClient } from './core/llm-client'
import { ToolDispatcher } from './core/tool-dispatcher'
import { agentRunnerLoop } from './core/agent-loop'
import { getDefaultTools } from './tools'
import { loadConfig, getApiKey } from './utils/config'

async function main() {
  console.log('🤖 GenericAgent TypeScript v0.1.0\n')

  // 加载配置
  const config = loadConfig()
  console.log(`📋 Provider: ${config.provider}`)
  console.log(`📋 Model: ${config.model}`)
  console.log(`📋 Max Turns: ${config.max_turns}\n`)

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

  console.log(`🔧 Loaded ${tools.length} tools:`)
  tools.forEach((tool) => console.log(`   - ${tool.name}: ${tool.description}`))
  console.log()

  // 获取用户输入
  const userInput = process.argv.slice(2).join(' ') || '你好，介绍一下你自己'

  console.log(`💬 User: ${userInput}\n`)
  console.log('🤖 Assistant:\n')

  try {
    // 执行 Agent 循环
    const stream = agentRunnerLoop(client, dispatcher, userInput, {
      maxTurns: config.max_turns,
      systemPrompt: config.system_prompt,
      streaming: true,
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
