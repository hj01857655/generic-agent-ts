/**
 * 工具注册表
 */

export { BaseTool } from './base'
export { FileReadTool } from './file-read'
export { FileWriteTool } from './file-write'
export { FilePatchTool } from './file-patch'
export { AskUserTool } from './ask-user'
export { CodeRunTool } from './code-run'
export { WebScanTool } from './web-scan'
export { WebControlTool } from './web-control'
export { WebExecuteJsTool } from './web-execute-js'
export { MemSearchTool } from './mem-search'
export { MemWriteTool } from './mem-write'
export { ReflectTool } from './reflect'
export { UpdateWorkingCheckpointTool, StartLongTermUpdateTool } from './working-memory'
export { NoToolTool } from './no-tool'
export type { WorkingMemory } from './working-memory'

import { FileReadTool } from './file-read'
import { FileWriteTool } from './file-write'
import { FilePatchTool } from './file-patch'
import { AskUserTool } from './ask-user'
import { CodeRunTool } from './code-run'
import { WebScanTool } from './web-scan'
import { WebControlTool } from './web-control'
import { WebExecuteJsTool } from './web-execute-js'
import { MemSearchTool } from './mem-search'
import { MemWriteTool } from './mem-write'
import { ReflectTool } from './reflect'
import { UpdateWorkingCheckpointTool, StartLongTermUpdateTool } from './working-memory'
import { NoToolTool } from './no-tool'
import type { BaseTool } from './base'
import type { WorkingMemory } from './working-memory'

/**
 * 获取所有默认工具
 */
export function getDefaultTools(
  dataDir: string = './.generic-agent',
  working: WorkingMemory = {},
  memoryDir: string = './memory'
): BaseTool[] {
  return [
    new FileReadTool(),
    new FileWriteTool(),
    new FilePatchTool(),
    new AskUserTool(),
    new CodeRunTool(),
    new WebScanTool(),
    new WebControlTool(),
    new WebExecuteJsTool(),
    new MemSearchTool(dataDir),
    new MemWriteTool(dataDir),
    new ReflectTool(),
    new UpdateWorkingCheckpointTool(working),
    new StartLongTermUpdateTool(memoryDir),
    // NoToolTool 不在这里注册，由 Agent Loop 特殊处理
  ]
}
