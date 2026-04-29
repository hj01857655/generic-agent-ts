/**
 * 工具注册表
 */

export { BaseTool } from './base'
export { FileReadTool } from './file-read'
export { FileWriteTool } from './file-write'
export { AskUserTool } from './ask-user'
export { CodeRunTool } from './code-run'
export { WebScanTool } from './web-scan'
export { WebControlTool } from './web-control'
export { MemSearchTool } from './mem-search'
export { MemWriteTool } from './mem-write'
export { ReflectTool } from './reflect'

import { FileReadTool } from './file-read'
import { FileWriteTool } from './file-write'
import { AskUserTool } from './ask-user'
import { CodeRunTool } from './code-run'
import { WebScanTool } from './web-scan'
import { WebControlTool } from './web-control'
import { MemSearchTool } from './mem-search'
import { MemWriteTool } from './mem-write'
import { ReflectTool } from './reflect'
import type { BaseTool } from './base'

/**
 * 获取所有默认工具
 */
export function getDefaultTools(dataDir: string = './.generic-agent'): BaseTool[] {
  return [
    new FileReadTool(),
    new FileWriteTool(),
    new AskUserTool(),
    new CodeRunTool(),
    new WebScanTool(),
    new WebControlTool(),
    new MemSearchTool(dataDir),
    new MemWriteTool(dataDir),
    new ReflectTool(),
  ]
}
