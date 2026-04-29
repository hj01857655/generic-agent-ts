/**
 * 文件写入工具
 */

import { z } from 'zod'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

/**
 * 文件写入参数
 */
const fileWriteSchema = z.object({
  path: z.string().describe('文件路径（相对或绝对）'),
  content: z.string().describe('文件内容'),
  encoding: z
    .enum(['utf-8', 'utf8', 'ascii', 'base64'])
    .default('utf-8')
    .describe('文件编码'),
  create_dirs: z
    .boolean()
    .default(true)
    .describe('是否自动创建目录'),
})

/**
 * 文件写入工具
 */
export class FileWriteTool extends BaseTool<typeof fileWriteSchema> {
  readonly name = 'file_write'
  readonly description = '写入文件内容（覆盖或创建）'
  readonly parameters = fileWriteSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(args: z.infer<typeof fileWriteSchema>): Promise<ToolOutcome> {
    try {
      // 解析路径
      const filePath = resolve(args.path)

      // 创建目录（如果需要）
      if (args.create_dirs) {
        const dir = dirname(filePath)
        await mkdir(dir, { recursive: true })
      }

      // 写入文件
      await writeFile(filePath, args.content, { encoding: args.encoding as BufferEncoding })

      return this.success(
        { path: filePath, size: args.content.length },
        `成功写入文件: ${args.path} (${args.content.length} 字符)`,
        TrustLevel.TOOL_SAFE
      )
    } catch (error) {
      return this.failure(
        `写入文件失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
