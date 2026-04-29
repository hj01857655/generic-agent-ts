/**
 * 工具基类
 */

import { z } from 'zod'
import type { ToolSchema, ToolHandler, ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

/**
 * 抽象工具类
 */
export abstract class BaseTool<T extends z.ZodObject<any> = z.ZodObject<any>> {
  /** 工具名称 */
  abstract readonly name: string

  /** 工具描述 */
  abstract readonly description: string

  /** 参数 Schema */
  abstract readonly parameters: T

  /** 默认信任级别 */
  protected readonly defaultTrustLevel: TrustLevel = TrustLevel.TOOL_SAFE

  /**
   * 执行工具
   */
  abstract execute(args: z.infer<T>): Promise<ToolOutcome>

  /**
   * 获取工具 Schema
   */
  getSchema(): ToolSchema {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    }
  }

  /**
   * 获取工具处理器
   */
  getHandler(): ToolHandler<z.infer<T>> {
    return async (args: z.infer<T>) => {
      try {
        // 参数校验
        const validatedArgs = this.parameters.parse(args)

        // 执行工具
        const outcome = await this.execute(validatedArgs)

        return outcome
      } catch (error) {
        return {
          data: null,
          next_prompt: `工具执行失败: ${error instanceof Error ? error.message : String(error)}`,
          trust_level: this.defaultTrustLevel,
          is_success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  }

  /**
   * 包装不可信输出
   */
  protected wrapUntrusted(data: unknown): string {
    return `<UNTRUSTED_TOOL_OUTPUT>\n${JSON.stringify(data, null, 2)}\n</UNTRUSTED_TOOL_OUTPUT>`
  }

  /**
   * 创建成功结果
   */
  protected success(
    data: unknown,
    nextPrompt: string,
    trustLevel: TrustLevel = this.defaultTrustLevel
  ): ToolOutcome {
    return {
      data,
      next_prompt: nextPrompt,
      trust_level: trustLevel,
      is_success: true,
    }
  }

  /**
   * 创建失败结果
   */
  protected failure(
    error: string,
    trustLevel: TrustLevel = this.defaultTrustLevel
  ): ToolOutcome {
    return {
      data: null,
      next_prompt: `工具执行失败: ${error}`,
      trust_level: trustLevel,
      is_success: false,
      error,
    }
  }
}
