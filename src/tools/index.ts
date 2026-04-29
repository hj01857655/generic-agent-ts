/**
 * 工具注册表
 */

export { BaseTool } from './base'
export { FileReadTool } from './file-read'
export { FileWriteTool } from './file-write'

import { FileReadTool } from './file-read'
import { FileWriteTool } from './file-write'
import type { BaseTool } from './base'

/**
 * 获取所有默认工具
 */
export function getDefaultTools(): BaseTool[] {
  return [
    new FileReadTool(),
    new FileWriteTool(),
    // TODO: 添加更多工具
    // new CodeRunTool(),
    // new WebScanTool(),
    // new WebControlTool(),
    // new MemSearchTool(),
    // new MemWriteTool(),
    // new PlanMakeTool(),
    // new ReflectTool(),
  ]
}
