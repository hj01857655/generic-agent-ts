/**
 * 记忆搜索工具
 */

import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'
import { MemoryStorage } from '@/memory/storage'

const memSearchSchema = z.object({
  query: z.string().describe('搜索关键词'),
  layer: z.enum(['L0', 'L1', 'L2', 'L3', 'L4']).optional().describe('记忆层级（可选）'),
  limit: z.number().int().min(1).max(50).default(10).describe('返回结果数量'),
})

export class MemSearchTool extends BaseTool<typeof memSearchSchema> {
  readonly name = 'mem_search'
  readonly description = '搜索记忆库（支持全文搜索）'
  readonly parameters = memSearchSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  private storage: MemoryStorage

  constructor(dataDir: string) {
    super()
    this.storage = new MemoryStorage(dataDir)
  }

  async execute(args: z.infer<typeof memSearchSchema>): Promise<ToolOutcome> {
    try {
      const results = this.storage.search(args.query, args.layer, args.limit)

      if (results.length === 0) {
        return this.success(
          [],
          `未找到匹配的记忆: ${args.query}`,
          TrustLevel.TOOL_SAFE
        )
      }

      const formatted = results.map((r) => ({
        id: r.id,
        layer: r.layer,
        name: r.name,
        content: r.content.slice(0, 200) + (r.content.length > 200 ? '...' : ''),
        tags: r.tags,
      }))

      return this.success(
        formatted,
        `找到 ${results.length} 条记忆:\n${formatted.map((r) => `- [${r.layer}] ${r.name}`).join('\n')}`,
        TrustLevel.TOOL_SAFE
      )
    } catch (error) {
      return this.failure(`搜索失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
