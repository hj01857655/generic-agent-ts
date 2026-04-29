/**
 * 配置管理
 */

import { z } from 'zod'
import type { AgentConfig } from '@/core/types'

/**
 * 环境变量 Schema
 */
const envSchema = z.object({
  // LLM 配置
  LLM_PROVIDER: z.enum(['claude', 'openai', 'ollama']).default('claude'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),

  // Agent 配置
  MAX_TURNS: z.coerce.number().int().min(1).max(100).default(20),
  CONTEXT_WINDOW: z.coerce.number().int().min(1000).default(200000),

  // 数据目录
  DATA_DIR: z.string().default('./.generic-agent'),

  // 日志级别
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

/**
 * 加载配置
 */
export function loadConfig(): AgentConfig {
  // 解析环境变量
  const env = envSchema.parse(process.env)

  // 确定模型
  let model: string
  switch (env.LLM_PROVIDER) {
    case 'claude':
      model = 'claude-3-5-sonnet-20241022'
      break
    case 'openai':
      model = 'gpt-4-turbo-preview'
      break
    case 'ollama':
      model = 'llama2'
      break
  }

  // 系统提示词
  const systemPrompt = `你是 GenericAgent，一个极简自进化的 AI Agent。

你的核心能力：
1. 使用工具完成任务（文件操作、代码执行、浏览器控制等）
2. 自动沉淀技能到记忆系统（L3 技能库）
3. 从历史经验中学习和复用

工作原则：
- 优先使用已有技能
- 遇到新问题时探索并记录
- 保持简洁高效
- 主动反思和改进

当前可用工具：
- file_read: 读取文件
- file_write: 写入文件
（更多工具加载中...）`

  return {
    provider: env.LLM_PROVIDER,
    model,
    max_turns: env.MAX_TURNS,
    context_window: env.CONTEXT_WINDOW,
    system_prompt: systemPrompt,
    data_dir: env.DATA_DIR,
  }
}

/**
 * 获取 API Key
 */
export function getApiKey(provider: 'claude' | 'openai'): string {
  const env = envSchema.parse(process.env)

  switch (provider) {
    case 'claude':
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is required for Claude provider')
      }
      return env.ANTHROPIC_API_KEY
    case 'openai':
      if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required for OpenAI provider')
      }
      return env.OPENAI_API_KEY
  }
}
