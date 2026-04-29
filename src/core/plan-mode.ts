/**
 * Plan 模式管理
 * 
 * 对应 Python 的 enter_plan_mode, _in_plan_mode, _exit_plan_mode, _check_plan_completion
 */

import * as fs from 'fs/promises'
import type { WorkingMemory } from './agent-loop'

/**
 * 进入 Plan 模式
 * 
 * 对应 Python 的 enter_plan_mode
 */
export function enterPlanMode(working: WorkingMemory, planPath: string): string {
  working.in_plan_mode = planPath
  console.log(`[Info] Entered plan mode with plan file: ${planPath}`)
  return planPath
}

/**
 * 检查是否在 Plan 模式
 * 
 * 对应 Python 的 _in_plan_mode
 */
export function inPlanMode(working: WorkingMemory): string | undefined {
  return working.in_plan_mode
}

/**
 * 退出 Plan 模式
 * 
 * 对应 Python 的 _exit_plan_mode
 */
export function exitPlanMode(working: WorkingMemory): void {
  delete working.in_plan_mode
  console.log('[Info] Exited plan mode')
}

/**
 * 检查 Plan 完成度
 * 
 * 对应 Python 的 _check_plan_completion
 * 
 * @returns 剩余未完成的任务数（[ ] 的数量），如果文件不存在返回 null
 */
export async function checkPlanCompletion(planPath: string): Promise<number | null> {
  try {
    await fs.access(planPath)
    const content = await fs.readFile(planPath, 'utf-8')
    const matches = content.match(/\[ \]/g)
    return matches ? matches.length : 0
  } catch {
    return null
  }
}
