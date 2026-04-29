/**
 * no_tool 工具 - 特殊工具，LLM 未调用工具时触发
 * 
 * 对应 Python 的 do_no_tool 方法
 */

import { BaseTool, ToolOutcome } from './base'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 工作记忆状态（由 Agent Loop 传入）
 */
export interface WorkingMemory {
  key_info?: string
  related_sop?: string
  passed_sessions?: number
  in_plan_mode?: string
}

export class NoToolTool extends BaseTool {
  name = 'no_tool'
  description = '这是一个特殊工具，由引擎自主调用，不要包含在TOOLS_SCHEMA里。当模型在一轮中未显式调用任何工具时，由引擎自动触发。'

  schema = {
    type: 'object' as const,
    properties: {},
    required: [],
  }

  private working: WorkingMemory

  constructor(working: WorkingMemory) {
    super()
    this.working = working
  }

  async execute(
    args: Record<string, unknown>,
    response?: { content: string; thinking?: string }
  ): Promise<ToolOutcome> {
    const content = response?.content || ''
    const thinking = response?.thinking || ''

    // 1. 检查空响应
    if (!content.trim() && !thinking.trim()) {
      return {
        data: {},
        next_prompt: '[System] Blank response, regenerate and tooluse',
        should_exit: false,
      }
    }

    // 2. 检查不完整响应
    if (content.length > 50) {
      const tail = content.slice(-100)
      if (tail.includes('未收到完整响应 !!!]') || tail.includes('!!!Error: [SSL:')) {
        return {
          data: {},
          next_prompt: '[System] Incomplete response. Regenerate and tooluse.',
          should_exit: false,
        }
      }
      if (tail.includes('max_tokens !!!]')) {
        return {
          data: {},
          next_prompt: '[System] max_tokens limit reached. Use multi small steps to do it.',
          should_exit: false,
        }
      }
    }

    // 3. Plan 模式完成声明拦截
    if (this.working.in_plan_mode) {
      const completionKeywords = ['任务完成', '全部完成', '已完成所有', '🏁']
      if (completionKeywords.some((kw) => content.includes(kw))) {
        if (
          !content.includes('VERDICT') &&
          !content.includes('[VERIFY]') &&
          !content.includes('验证subagent')
        ) {
          return {
            data: {},
            next_prompt:
              '⛔ [验证拦截] 检测到你在plan模式下声称完成，但未执行[VERIFY]验证步骤。请先按plan_sop §四启动验证subagent，获得VERDICT后才能声称完成。',
            should_exit: false,
          }
        }
      }
    }

    // 4. 检测大代码块但未调用工具
    const codeBlockPattern = /```[a-zA-Z0-9_]*\n[\s\S]{50,}?```/g
    const blocks = content.match(codeBlockPattern) || []

    if (blocks.length === 1) {
      const match = content.match(codeBlockPattern)
      if (match) {
        const afterBlock = content.slice(match.index! + match[0].length)
        if (!afterBlock.trim()) {
          let residual = content.replace(match[0], '')
          residual = residual.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
          residual = residual.replace(/<summary>[\s\S]*?<\/summary>/gi, '')
          const cleanResidual = residual.replace(/\s+/g, '')

          if (cleanResidual.length <= 30) {
            return {
              data: {},
              next_prompt: `[System] 检测到你在上一轮回复中主要内容是较大代码块，且本轮未调用任何工具。
如果这些代码需要执行、写入文件或进一步分析，请重新组织回复并显式调用相应工具（例如：code_run、file_write、file_patch 等）；
如果只是向用户展示或讲解代码片段，请在回复中补充自然语言说明，并明确是否还需要额外的实际操作。`,
              should_exit: false,
            }
          }
        }
      }
    }

    // 5. 检查 Plan 模式完成
    if (this.working.in_plan_mode) {
      const remaining = await this.checkPlanCompletion(this.working.in_plan_mode)
      if (remaining === 0) {
        delete this.working.in_plan_mode
        console.log('[Info] Plan完成：plan.md中0个[ ]残留，退出plan模式。')
      }
    }

    // 6. 正常结束
    return {
      data: response || {},
      next_prompt: null,
      should_exit: false,
    }
  }

  /**
   * 检查 Plan 完成度
   */
  private async checkPlanCompletion(planPath: string): Promise<number | null> {
    try {
      await fs.access(planPath)
      const content = await fs.readFile(planPath, 'utf-8')
      const matches = content.match(/\[ \]/g)
      return matches ? matches.length : 0
    } catch {
      return null
    }
  }
}
