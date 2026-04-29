/**
 * 文件补丁工具
 */

import { z } from 'zod'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

const filePatchSchema = z.object({
  path: z.string().describe('文件路径'),
  old_content: z.string().describe('要替换的旧内容（必须唯一匹配）'),
  new_content: z.string().describe('新内容'),
})

/**
 * 文件补丁工具
 * 
 * 在文件中寻找唯一的 old_content 块并替换为 new_content
 * 对应 Python 的 file_patch
 */
export class FilePatchTool extends BaseTool<typeof filePatchSchema> {
  readonly name = 'file_patch'
  readonly description = '精确替换文件中的内容块（必须唯一匹配）'
  readonly parameters = filePatchSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  async execute(args: z.infer<typeof filePatchSchema>): Promise<ToolOutcome> {
    try {
      const filePath = resolve(args.path)

      // 读取文件
      const fullText = await readFile(filePath, 'utf-8')

      if (!args.old_content) {
        return this.failure('old_content 为空，请确认 arguments')
      }

      // 检查匹配次数
      const count = (fullText.match(new RegExp(escapeRegExp(args.old_content), 'g')) || []).length

      if (count === 0) {
        return this.failure(
          '未找到匹配的旧文本块，建议：先用 file_read 确认当前内容，再分小段进行 patch。' +
          '若多次失败则询问用户，严禁自行使用 overwrite 或代码替换。'
        )
      }

      if (count > 1) {
        return this.failure(
          `找到 ${count} 处匹配，无法确定唯一位置。` +
          '请提供更长、更具体的旧文本块以确保唯一性。' +
          '建议：包含上下文行来增强特征，或分小段逐个修改。'
        )
      }

      // 执行替换
      const updatedText = fullText.replace(args.old_content, args.new_content)
      await writeFile(filePath, updatedText, 'utf-8')

      return this.success(
        { status: 'success', path: filePath },
        '文件局部修改成功',
        TrustLevel.TOOL_SAFE
      )
    } catch (error) {
      return this.failure(
        `补丁失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
