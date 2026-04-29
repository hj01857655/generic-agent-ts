/**
 * 网页抓取工具
 */

import { z } from 'zod'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

/**
 * 网页抓取参数
 */
const webScanSchema = z.object({
  url: z.string().url().describe('要抓取的网页 URL'),
  selector: z.string().optional().describe('CSS 选择器（可选，用于提取特定内容）'),
  timeout: z
    .number()
    .int()
    .min(1000)
    .max(30000)
    .default(10000)
    .describe('超时时间（毫秒）'),
})

/**
 * 网页抓取工具
 * 
 * 使用 fetch API 抓取网页内容
 * 返回的内容标记为 UNTRUSTED（防御 Prompt Injection）
 */
export class WebScanTool extends BaseTool<typeof webScanSchema> {
  readonly name = 'web_scan'
  readonly description = '抓取网页内容（HTML 或文本）'
  readonly parameters = webScanSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_UNTRUSTED

  async execute(args: z.infer<typeof webScanSchema>): Promise<ToolOutcome> {
    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), args.timeout)

      try {
        // 发起请求
        const response = await fetch(args.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'GenericAgent/0.1.0',
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          return this.failure(`HTTP ${response.status}: ${response.statusText}`)
        }

        // 获取内容
        const html = await response.text()

        // 如果指定了选择器，尝试提取（简单实现）
        let content = html
        if (args.selector) {
          // TODO: 使用 cheerio 或 jsdom 解析 HTML
          content = `[选择器功能待实现]\n${html.slice(0, 1000)}...`
        }

        // 限制内容长度
        const maxLength = 10000
        if (content.length > maxLength) {
          content = content.slice(0, maxLength) + '\n...[内容已截断]'
        }

        return this.success(
          { url: args.url, content, length: html.length },
          `成功抓取网页:\n${this.wrapUntrusted(content)}`,
          TrustLevel.TOOL_UNTRUSTED
        )
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return this.failure(`请求超时（${args.timeout}ms）`)
      }

      return this.failure(
        `抓取失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
