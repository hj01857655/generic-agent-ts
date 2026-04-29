/**
 * no_tool 工具 - 特殊工具，LLM 未调用工具时触发
 */

import { z } from 'zod'
import { readFile, access } from 'node:fs/promises'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

export interface WorkingMemory {
  key_info?: string
  related_sop?: string
  passed_sessions?: number
  in_plan_mode?: string
}

const noToolSchema = z.object({})

export class NoToolTool extends BaseTool<typeof noToolSchema> {
  readonly name = 'no_tool'
  readonly description = '特殊工具，由引擎自主调用'
  readonly parameters = noToolSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  private working: WorkingMemory

  constructor(working: WorkingMemory) {
    super()
    this.working = working
  }

  async execute(
    _args: z.infer<typeof noToolSchema>,
    response?: { content: string; thinking?: string }
  ): Promise<ToolOutcome> {
    const content = response?.content || ''

    // 检查空响应
    if (!content.trim()) {
      return this.success({}, '[System] Blank response', TrustLevel.TOOL_SAFE)
    }

    // Plan 模式完成声明拦截
    if (this.working.in_plan_mode) {
      const completionKeywords = ['任务完成', '全部完成', '已完成所有', '🏁']
      if (completionKeywords.some((kw) => content.includes(kw))) {
        if (!content.includes('VERDICT') && !content.includes('[VERIFY]')) {
          return this.success({}, '⛔ [验证拦截]', TrustLevel.TOOL_SAFE)
        }
      }
    }

    // 检查 Plan 模式完成
    if (this.working.in_plan_mode) {
      const remaining = await this.checkPlanCompletion(this.working.in_plan_mode)
      if (remaining === 0) {
        delete this.working.in_plan_mode
      }
    }

    return this.success(response || {}, 'No tool called', TrustLevel.TOOL_SAFE)
  }

  private async checkPlanCompletion(planPath: string): Promise<number | null> {
    try {
      await access(planPath)
      const content = await readFile(planPath, 'utf-8')
      const matches = content.match(/\[ \]/g)
      return matches ? matches.length : 0
    } catch {
      return null
    }
  }
}
