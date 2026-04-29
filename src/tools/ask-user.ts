/**
 * 询问用户工具
 */

import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

/**
 * 询问用户参数
 */
const askUserSchema = z.object({
  question: z.string().describe('要询问用户的问题'),
  context: z.string().optional().describe('问题的上下文信息'),
})

/**
 * 询问用户工具
 * 
 * 注意：这是一个特殊工具，需要前端支持
 * CLI 模式下会暂停等待用户输入
 */
export class AskUserTool extends BaseTool<typeof askUserSchema> {
  readonly name = 'ask_user'
  readonly description = '向用户询问问题，获取额外信息或确认'
  readonly parameters = askUserSchema
  protected readonly defaultTrustLevel = TrustLevel.USER

  async execute(args: z.infer<typeof askUserSchema>): Promise<ToolOutcome> {
    try {
      // 格式化问题
      let prompt = `\n❓ ${args.question}\n`
      if (args.context) {
        prompt += `   上下文: ${args.context}\n`
      }
      prompt += '   请输入回答: '

      // 输出问题
      process.stdout.write(prompt)

      // 等待用户输入
      const answer = await this.readUserInput()

      return this.success(
        answer,
        `用户回答: ${answer}`,
        TrustLevel.USER
      )
    } catch (error) {
      return this.failure(
        `获取用户输入失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 读取用户输入
   */
  private async readUserInput(): Promise<string> {
    return new Promise((resolve) => {
      const stdin = process.stdin
      stdin.setEncoding('utf-8')
      stdin.resume()

      const onData = (data: string) => {
        stdin.pause()
        stdin.removeListener('data', onData)
        resolve(data.trim())
      }

      stdin.on('data', onData)
    })
  }
}
