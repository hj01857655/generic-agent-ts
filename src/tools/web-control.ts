/**
 * 浏览器控制工具（Playwright）
 */

import { z } from 'zod'
import { chromium, type Browser, type Page } from 'playwright'
import { BaseTool } from './base'
import type { ToolOutcome } from '@/core/types'
import { TrustLevel } from '@/core/types'

const webControlSchema = z.object({
  action: z.enum(['goto', 'click', 'fill', 'screenshot', 'close']).describe('操作类型'),
  url: z.string().optional().describe('URL（goto 操作必需）'),
  selector: z.string().optional().describe('CSS 选择器（click/fill 操作必需）'),
  text: z.string().optional().describe('输入文本（fill 操作必需）'),
  path: z.string().optional().describe('截图路径（screenshot 操作可选）'),
})

/**
 * 浏览器控制工具
 * 
 * 使用 Playwright 控制浏览器
 */
export class WebControlTool extends BaseTool<typeof webControlSchema> {
  readonly name = 'web_control'
  readonly description = '控制浏览器（导航、点击、输入、截图）'
  readonly parameters = webControlSchema
  protected readonly defaultTrustLevel = TrustLevel.TOOL_UNTRUSTED

  private static browser: Browser | null = null
  private static page: Page | null = null

  async execute(args: z.infer<typeof webControlSchema>): Promise<ToolOutcome> {
    try {
      // 确保浏览器已启动
      if (!WebControlTool.browser) {
        WebControlTool.browser = await chromium.launch({ headless: false })
        WebControlTool.page = await WebControlTool.browser.newPage()
      }

      const page = WebControlTool.page!

      switch (args.action) {
        case 'goto': {
          if (!args.url) {
            return this.failure('goto 操作需要 url 参数')
          }
          await page.goto(args.url, { waitUntil: 'domcontentloaded' })
          const title = await page.title()
          return this.success(
            { url: args.url, title },
            `已导航到: ${args.url}\n标题: ${title}`,
            TrustLevel.TOOL_UNTRUSTED
          )
        }

        case 'click': {
          if (!args.selector) {
            return this.failure('click 操作需要 selector 参数')
          }
          await page.click(args.selector)
          return this.success(
            { selector: args.selector },
            `已点击元素: ${args.selector}`,
            TrustLevel.TOOL_UNTRUSTED
          )
        }

        case 'fill': {
          if (!args.selector || !args.text) {
            return this.failure('fill 操作需要 selector 和 text 参数')
          }
          await page.fill(args.selector, args.text)
          return this.success(
            { selector: args.selector, text: args.text },
            `已输入文本到: ${args.selector}`,
            TrustLevel.TOOL_UNTRUSTED
          )
        }

        case 'screenshot': {
          const path = args.path || `screenshot_${Date.now()}.png`
          await page.screenshot({ path })
          return this.success(
            { path },
            `已保存截图: ${path}`,
            TrustLevel.TOOL_SAFE
          )
        }

        case 'close': {
          if (WebControlTool.browser) {
            await WebControlTool.browser.close()
            WebControlTool.browser = null
            WebControlTool.page = null
          }
          return this.success(
            null,
            '已关闭浏览器',
            TrustLevel.TOOL_SAFE
          )
        }

        default:
          return this.failure(`未知操作: ${args.action}`)
      }
    } catch (error) {
      return this.failure(
        `浏览器操作失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
