/**
 * 使用 Session 管理的示例
 */

import { LLMClient } from '../src/core/llm-client'
import { ToolDispatcher } from '../src/core/tool-dispatcher'
import { agentRunnerLoop } from '../src/core/agent-loop'
import { SessionManager } from '../src/core/session'
import { getDefaultTools } from '../src/tools'
import { loadConfig, getApiKey } from '../src/utils/config'

async function main() {
  // 加载配置
  const config = loadConfig()

  // 创建 Session 管理器
  const sessionManager = new SessionManager(config.data_dir)

  // 获取或创建 Session
  const sessionId = process.env.SESSION_ID || 'default'
  let session

  try {
    // 尝试加载已有 Session
    session = await sessionManager.load(sessionId)
    console.log(`📂 加载已有 Session: ${sessionId}`)
  } catch {
    // 创建新 Session
    session = sessionManager.create(sessionId)
    console.log(`📝 创建新 Session: ${sessionId}`)
  }

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

  // 用户输入
  const userInput = process.argv.slice(2).join(' ') || '你好，我们之前聊过什么？'

  console.log(`💬 User: ${userInput}\n`)
  console.log('🤖 Assistant:\n')

  try {
    // 执行 Agent 循环（使用 Session）
    const stream = agentRunnerLoop(client, dispatcher, userInput, {
      maxTurns: config.max_turns,
      systemPrompt: config.system_prompt,
      verbose: true,
      contextWindow: config.context_window,
      session, // 传入 Session
    })

    // 流式输出
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        process.stdout.write(chunk.content)
      }
    }

    // 保存 Session
    await session.save()
    console.log(`\n\n💾 Session 已保存: ${sessionId}`)

    console.log('\n✅ 任务完成')
  } catch (error) {
    console.error('\n\n❌ 错误:', error instanceof Error ? error.message : String(error))
    
    // 即使出错也保存 Session
    try {
      await session.save()
    } catch {}
    
    process.exit(1)
  }
}

main()
