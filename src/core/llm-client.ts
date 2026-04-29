/**
 * LLM 客户端适配层
 */

import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { streamText, type CoreMessage, type CoreTool } from 'ai'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Message, ToolSchema, StreamChunk, LLMResponse, ToolCall } from './types'
import { LLMError } from './types'

/**
 * LLM 客户端配置
 */
export interface LLMClientConfig {
  provider: 'claude' | 'openai' | 'ollama'
  model: string
  apiKey?: string
  baseURL?: string
}

/**
 * LLM 客户端
 */
export class LLMClient {
  private config: LLMClientConfig

  constructor(config: LLMClientConfig) {
    this.config = config
  }

  /**
   * 流式对话
   */
  async *chat(
    messages: Message[],
    tools: ToolSchema[],
    systemPrompt?: string
  ): AsyncGenerator<StreamChunk, LLMResponse> {
    try {
      // 转换消息格式
      const coreMessages = this.convertMessages(messages)

      // 转换工具格式
      const coreTools = this.convertTools(tools)

      // 获取模型
      const model = this.getModel()

      // 调用 AI SDK
      const result = await streamText({
        model,
        messages: coreMessages,
        tools: coreTools,
        system: systemPrompt,
        maxTokens: 4096,
      })

      // 流式输出
      let fullText = ''
      const toolCalls: ToolCall[] = []

      for await (const chunk of result.textStream) {
        fullText += chunk
        yield { type: 'text', content: chunk }
      }

      // 等待完成
      const response = await result.response

      // 提取工具调用
      if (result.toolCalls) {
        for (const toolCall of result.toolCalls) {
          const tc: ToolCall = {
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            args: toolCall.args as Record<string, unknown>,
          }
          toolCalls.push(tc)
          yield { type: 'tool_call', tool_call: tc }
        }
      }

      // 返回最终响应
      const llmResponse: LLMResponse = {
        content: fullText,
        tool_calls: toolCalls,
        stop_reason: this.mapStopReason(response.finishReason),
      }

      yield { type: 'done', response: llmResponse }

      return llmResponse
    } catch (error) {
      throw new LLMError(
        `LLM request failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      )
    }
  }

  /**
   * 获取模型实例
   */
  private getModel() {
    switch (this.config.provider) {
      case 'claude':
        return anthropic(this.config.model, {
          apiKey: this.config.apiKey,
        })
      case 'openai':
        return openai(this.config.model, {
          apiKey: this.config.apiKey,
        })
      case 'ollama':
        // TODO: 实现 Ollama 支持
        throw new LLMError('Ollama provider not implemented yet')
      default:
        throw new LLMError(`Unknown provider: ${this.config.provider}`)
    }
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: Message[]): CoreMessage[] {
    return messages.map((msg) => {
      const coreMsg: CoreMessage = {
        role: msg.role === 'system' ? 'system' : msg.role,
        content: msg.content,
      }

      // 添加工具结果
      if (msg.tool_results && msg.tool_results.length > 0) {
        // AI SDK 会自动处理工具结果
        // 这里我们将工具结果附加到内容中
        const toolResultsText = msg.tool_results
          .map((tr) => `[Tool: ${tr.tool_name}]\n${tr.content}`)
          .join('\n\n')
        coreMsg.content = `${msg.content}\n\n${toolResultsText}`
      }

      return coreMsg
    })
  }

  /**
   * 转换工具格式
   */
  private convertTools(tools: ToolSchema[]): Record<string, CoreTool> {
    const coreTools: Record<string, CoreTool> = {}

    for (const tool of tools) {
      coreTools[tool.name] = {
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters),
      }
    }

    return coreTools
  }

  /**
   * 映射停止原因
   */
  private mapStopReason(
    reason: string | undefined
  ): 'end_turn' | 'max_tokens' | 'tool_use' | null {
    switch (reason) {
      case 'stop':
        return 'end_turn'
      case 'length':
        return 'max_tokens'
      case 'tool-calls':
        return 'tool_use'
      default:
        return null
    }
  }
}
