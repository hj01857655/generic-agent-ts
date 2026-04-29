/**
 * web_execute_js 工具 - 执行 JS 控制浏览器
 */

import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

const webExecuteJsSchema = z.object({
  script: z.string().describe('JavaScript 脚本内容或文件路径'),
  save_to_file: z.string().optional().describe('可选，将 js_return 结果保存到文件'),
  switch_tab_id: z.string().optional().describe('可选，切换到指定标签页'),
  tab_id: z.string().optional().describe('switch_tab_id 的别名'),
  no_monitor: z.boolean().optional().describe('是否禁用监控'),
})

export class WebExecuteJsTool extends BaseTool<typeof webExecuteJsSchema> {
  readonly name = 'web_execute_js'
  readonly description = 'web情况下的优先使用工具，执行任何js达成对浏览器的*完全*控制'
  readonly parameters = webExecuteJsSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(args: z.infer<typeof webExecuteJsSchema>): Promise<ToolOutcome> {
    let script = args.script

    // 检查是否是文件路径
    const absPath = resolve(script.trim())
    try {
      script = await readFile(absPath, 'utf-8')
    } catch {
      // 不是文件路径，直接使用脚本内容
    }

    // TODO: 实现浏览器控制逻辑
    const result = {
      status: 'error',
      msg: 'Browser automation not implemented yet',
      js_return: '',
    }

    // 如果需要保存结果
    if (args.save_to_file && result.js_return) {
      const content = String(result.js_return)
      const savePath = resolve(args.save_to_file)
      
      try {
        await writeFile(savePath, content, 'utf-8')
        result.js_return = content.slice(0, 170) + `\n\n[已保存完整内容到 ${savePath}]`
      } catch {
        result.js_return = content.slice(0, 170) + `\n\n[保存失败]`
      }
    }

    return this.success(result, 'JS executed', TrustLevel.TOOL_SAFE)
  }
}
