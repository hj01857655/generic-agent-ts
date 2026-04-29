/**
 * 工具注册表
 */

export { BaseTool } from './base'
export { FileReadTool } from './file-read'
export { FileWriteTool } from './file-write'
export { AskUserTool } from './ask-user'
export { CodeRunTool } from './code-run'
export { WebScanTool } from './web-scan'

import { FileReadTool } from './file-read'
import { FileWriteTool } from './file-write'
import { AskUserTool } from './ask-user'
import { CodeRunTool } from './code-run'
import { WebScanTool } from './web-scan'
import type { BaseTool } from './base'

/**
 * 获取所有默认工具
 */
export function getDefaultTools(): BaseTool[] {
  return [
    new FileReadTool(),
    new FileWriteTool(),
    new AskUserTool(),
    new CodeRunTool(),
    new WebScanTool(),
    // TODO: 添加更多工具
    // new WebControlTool(),  // Playwright 浏览器控制
    // new MemSearchTool(),   // 记忆搜索
    // new MemWriteTool(),    // 记忆写入
    // new PlanMakeTool(),    // 计划制定
    // new ReflectTool(),     // 反思总结
  ]
}
