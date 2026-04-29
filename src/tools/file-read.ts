/**
 * 文件读取工具
 */

import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

/**
 * 文件读取参数
 */
const fileReadSchema = z.object({
  path: z.string().describe('文件路径（相对或绝对）'),
  encoding: z
    .enum(['utf-8', 'utf8', 'ascii', 'base64'])
    .default('utf-8')
    .describe('文件编码'),
})

/**
 * 文件读取工具
 */
export class FileReadTool extends BaseTool<typeof fileReadSchema> {
  readonly name = 'file_read'
  readonly description = '读取文件内容'
  readonly parameters = fileReadSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(args: z.infer<typeof fileReadSchema>): Promise<ToolOutcome> {
    try {
      // 解析路径
      const filePath = resolve(args.path)

      // 读取文件
      const content = await readFile(filePath, { encoding: args.encoding as BufferEncoding })

      return this.success(
        content,
        `成功读取文件: ${args.path} (${content.length} 字符)`,
        TrustLevel.TOOL_SAFE
      )
    } catch (error) {
      return this.failure(
        `读取文件失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
