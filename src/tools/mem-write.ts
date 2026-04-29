/**
 * 记忆写入工具
 */

import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome, MemoryEntry } from '@/core/types'
import { TrustLevel } from '@/core/types'
import { MemoryStorage } from '@/memory/storage'

const memWriteSchema = z.object({
  layer: z.enum(['L0', 'L1', 'L2', 'L3', 'L4']).describe('记忆层级'),
  name: z.string().describe('记忆名称'),
  content: z.string().describe('记忆内容'),
  tags: z.array(z.string()).default([]).describe('标签列表'),
  metadata: z.record(z.unknown()).default({}).describe('元数据'),
})

export class MemWriteTool extends BaseTool<typeof memWriteSchema> {
  readonly name = 'mem_write'
  readonly description = '写入记忆到记忆库'
  readonly parameters = memWriteSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_SAFE

  private storage: MemoryStorage

  constructor(dataDir: string) {
    super()
    this.storage = new MemoryStorage(dataDir)
  }

  async execute(args: z.infer<typeof memWriteSchema>): Promise<ToolOutcome> {
    try {
      const now = Date.now()
      const id = `${args.layer}_${args.name}_${now}`

      const entry: MemoryEntry = {
        id,
        layer: args.layer,
        name: args.name,
        content: args.content,
        tags: args.tags,
        metadata: args.metadata,
        created_at: now,
        updated_at: now,
      }

      this.storage.save(entry)

      return this.success(
        { id, layer: args.layer, name: args.name },
        `成功写入记忆: [${args.layer}] ${args.name}`,
        TrustLevel.TOOL_SAFE
      )
    } catch (error) {
      return this.failure(`写入失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
