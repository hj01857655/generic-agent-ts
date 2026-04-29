/**
 * 工具分发器
 */

import type { BaseTool } from '@/tools/base'
import type { ToolOutcome, ToolSchema, ToolResult } from './types'
import { TrustLevel, UnknownToolError, ToolError } from './types'

/**
 * 工具分发器
 */
export class ToolDispatcher {
  private tools: Map<string, BaseTool> = new Map()

  /**
   * 注册工具
   */
  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * 批量注册工具
   */
  registerAll(tools: BaseTool[]): void {
    tools.forEach((tool) => this.register(tool))
  }

  /**
   * 获取所有工具 Schema
   */
  getSchemas(): ToolSchema[] {
    return Array.from(this.tools.values()).map((tool) => tool.getSchema())
  }

  /**
   * 分发工具调用
   */
  async dispatch(toolName: string, args: unknown): Promise<ToolOutcome> {
    const tool = this.tools.get(toolName)

    if (!tool) {
      throw new UnknownToolError(toolName)
    }

    try {
      const handler = tool.getHandler()
      const outcome = await handler(args)
      return outcome
    } catch (error) {
      throw new ToolError(
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        toolName,
        error
      )
    }
  }

  /**
   * 格式化工具结果为消息内容
   */
  formatToolResult(
    toolUseId: string,
    toolName: string,
    outcome: ToolOutcome
  ): ToolResult {
    let content: string

    // 根据信任级别包装输出
    if (outcome.trust_level === TrustLevel.TOOL_UNTRUSTED) {
      content = `<UNTRUSTED_TOOL_OUTPUT>\n${JSON.stringify(outcome.data, null, 2)}\n</UNTRUSTED_TOOL_OUTPUT>`
    } else {
      content = typeof outcome.data === 'string' 
        ? outcome.data 
        : JSON.stringify(outcome.data, null, 2)
    }

    return {
      tool_use_id: toolUseId,
      tool_name: toolName,
      content,
      trust_level: outcome.trust_level,
      is_success: outcome.is_success,
      error: outcome.error,
    }
  }

  /**
   * 检查工具是否存在
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName)
  }

  /**
   * 获取工具列表
   */
  list(): string[] {
    return Array.from(this.tools.keys())
  }
}
