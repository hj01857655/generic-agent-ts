/**
 * 代码执行工具（沙箱）
 */

import { z } from 'zod'
import { VM } from 'vm2'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

/**
 * 代码执行参数
 */
const codeRunSchema = z.object({
  code: z.string().describe('要执行的 JavaScript 代码'),
  timeout: z
    .number()
    .int()
    .min(100)
    .max(30000)
    .default(5000)
    .describe('超时时间（毫秒）'),
})

/**
 * 代码执行工具
 * 
 * 使用 VM2 沙箱隔离执行，防止恶意代码
 */
export class CodeRunTool extends BaseTool<typeof codeRunSchema> {
  readonly name = 'code_run'
  readonly description = '在沙箱环境中执行 JavaScript 代码'
  readonly parameters = codeRunSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_UNTRUSTED

  async execute(args: z.infer<typeof codeRunSchema>): Promise<ToolOutcome> {
    try {
      // 创建沙箱
      const vm = new VM({
        timeout: args.timeout,
        sandbox: {
          // 提供安全的 console
          console: {
            log: (...args: any[]) => {
              return args.map(String).join(' ')
            },
          },
        },
      })

      // 执行代码
      const result = vm.run(args.code)

      // 格式化结果
      const output = typeof result === 'string' 
        ? result 
        : JSON.stringify(result, null, 2)

      return this.success(
        { result, output },
        `代码执行成功:\n${this.wrapUntrusted(output)}`,
        TrustLevel.TOOL_UNTRUSTED
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      // 区分超时错误和其他错误
      if (errorMsg.includes('Script execution timed out')) {
        return this.failure(`代码执行超时（${args.timeout}ms）`)
      }

      return this.failure(`代码执行失败: ${errorMsg}`)
    }
  }
}
