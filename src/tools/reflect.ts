/**
 * 反思总结工具
 */

import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

const reflectSchema = z.object({
  summary: z.string().describe('任务总结'),
  learnings: z.array(z.string()).default([]).describe('学到的经验'),
  improvements: z.array(z.string()).default([]).describe('改进建议'),
})

/**
 * 反思总结工具
 * 
 * 用于 Agent 反思和总结任务执行情况
 */
export class ReflectTool extends BaseTool<typeof reflectSchema> {
  readonly name = 'reflect'
  readonly description = '反思总结任务执行情况，记录经验和改进建议'
  readonly parameters = reflectSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(args: z.infer<typeof reflectSchema>): Promise<ToolOutcome> {
    try {
      const reflection = {
        summary: args.summary,
        learnings: args.learnings,
        improvements: args.improvements,
        timestamp: Date.now(),
      }

      // 格式化输出
      let output = `📝 任务总结:\n${args.summary}\n`

      if (args.learnings.length > 0) {
        output += `\n💡 学到的经验:\n${args.learnings.map((l) => `- ${l}`).join('\n')}\n`
      }

      if (args.improvements.length > 0) {
        output += `\n🔧 改进建议:\n${args.improvements.map((i) => `- ${i}`).join('\n')}\n`
      }

      // 返回 done（任务完成）
      return this.done(reflection, TrustLevel.TOOL_SAFE)
    } catch (error) {
      return this.failure(
        `反思失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
