/**
 * 工作记忆管理工具
 */

import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

/**
 * 工作记忆状态
 */
export interface WorkingMemory {
  key_info: string
  related_sop: string
  passed_sessions: number
}

/**
 * 全局工作记忆（单例）
 */
let globalWorkingMemory: WorkingMemory = {
  key_info: '',
  related_sop: '',
  passed_sessions: 0,
}

/**
 * 获取全局工作记忆
 */
export function getWorkingMemory(): WorkingMemory {
  return globalWorkingMemory
}

/**
 * 重置工作记忆
 */
export function resetWorkingMemory(): void {
  globalWorkingMemory = {
    key_info: '',
    related_sop: '',
    passed_sessions: 0,
  }
}

// ============================================================================
// update_working_checkpoint 工具
// ============================================================================

const updateWorkingCheckpointSchema = z.object({
  key_info: z.string().optional().describe('任务关键信息'),
  related_sop: z.string().optional().describe('相关 SOP 文件路径'),
})

/**
 * 更新工作记忆检查点
 * 
 * 对应 Python 的 do_update_working_checkpoint
 */
export class UpdateWorkingCheckpointTool extends BaseTool<typeof updateWorkingCheckpointSchema> {
  readonly name = 'update_working_checkpoint'
  readonly description = '为整个任务设定后续需要临时记忆的重点'
  readonly parameters = updateWorkingCheckpointSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(args: z.infer<typeof updateWorkingCheckpointSchema>): Promise<ToolOutcome> {
    if (args.key_info !== undefined) {
      globalWorkingMemory.key_info = args.key_info
    }

    if (args.related_sop !== undefined) {
      globalWorkingMemory.related_sop = args.related_sop
    }

    globalWorkingMemory.passed_sessions = 0

    return this.success(
      { result: 'working key_info updated' },
      'Updated key_info and related_sop',
      TrustLevel.TOOL_SAFE
    )
  }
}

// ============================================================================
// start_long_term_update 工具
// ============================================================================

const startLongTermUpdateSchema = z.object({
  trigger: z.boolean().default(true).describe('触发长期记忆更新'),
})

/**
 * 启动长期记忆更新
 * 
 * 对应 Python 的 do_start_long_term_update
 */
export class StartLongTermUpdateTool extends BaseTool<typeof startLongTermUpdateSchema> {
  readonly name = 'start_long_term_update'
  readonly description = 'Agent 觉得当前任务完成后有重要信息需要记忆时调用此工具'
  readonly parameters = startLongTermUpdateSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(_args: z.infer<typeof startLongTermUpdateSchema>): Promise<ToolOutcome> {
    const prompt = `### [总结提炼经验] 既然你觉得当前任务有重要信息需要记忆，请提取最近一次任务中【事实验证成功且长期有效】的环境事实、用户偏好、重要步骤，更新记忆。
本工具是标记开启结算过程，若已在更新记忆过程或没有值得记忆的点，忽略本次调用。
**如果没有经验证的，未来能用上的信息，忽略本次调用！**
**只能提取行动验证成功的信息**：
- **环境事实**（路径/凭证/配置）→ \`file_patch\` 更新 L2，同步 L1
- **复杂任务经验**（关键坑点/前置条件/重要步骤）→ L3 精简 SOP（只记你被坑得多次重试的核心要点）
**禁止**：临时变量、具体推理过程、未验证信息、通用常识、你可以轻松复现的细节、只是做了但没有验证的信息
**操作**：严格遵循提供的L0的记忆更新SOP。先 \`file_read\` 看现有 → 判断类型 → 最小化更新 → 无新内容跳过，保证对记忆库最小局部修改。
`

    return this.success(
      { status: 'started' },
      prompt,
      TrustLevel.TOOL_SAFE
    )
  }
}
