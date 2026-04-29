/**
 * 代码执行工具（沙箱）
 */

import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

const codeRunSchema = z.object({
  code: z.string().describe('要执行的 JavaScript 代码'),
  timeout: z.number().int().min(100).max(30000).default(5000).describe('超时时间（毫秒）'),
})

export class CodeRunTool extends BaseTool<typeof codeRunSchema> {
  readonly name = 'code_run'
  readonly description = '在沙箱环境中执行 JavaScript 代码'
  readonly parameters = codeRunSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_UNTRUSTED

  async execute(_args: z.infer<typeof codeRunSchema>): Promise<ToolOutcome> {
    // TODO: 实现真正的沙箱执行（需要 vm2 或其他沙箱库）
    return this.failure('Code execution not implemented yet. Need to integrate vm2 or similar sandbox.')
  }
}
