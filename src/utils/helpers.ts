/**
 * 辅助函数
 * 
 * 对应 Python 的各种辅助函数
 */

import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 展开文件引用
 * 
 * 展开文本中的 {{file:路径:起始行:结束行}} 引用为实际文件内容
 * 对应 Python 的 expand_file_refs
 */
export async function expandFileRefs(text: string, baseDir: string = '.'): Promise<string> {
  const pattern = /\{\{file:(.+?):(\d+):(\d+)\}\}/g
  const matches = Array.from(text.matchAll(pattern))

  let result = text

  for (const match of matches) {
    const [fullMatch, filePath, startStr, endStr] = match
    const start = parseInt(startStr!, 10)
    const end = parseInt(endStr!, 10)

    try {
      const absPath = path.resolve(baseDir, filePath!)

      // 检查文件是否存在
      try {
        await fs.access(absPath)
      } catch {
        throw new Error(`引用文件不存在: ${absPath}`)
      }

      // 读取文件
      const content = await fs.readFile(absPath, 'utf-8')
      const lines = content.split('\n')

      // 检查行号范围
      if (start < 1 || end > lines.length || start > end) {
        throw new Error(`行号越界: ${absPath} 共${lines.length}行, 请求${start}-${end}`)
      }

      // 提取行范围
      const extracted = lines.slice(start - 1, end).join('\n')

      // 替换
      result = result.replace(fullMatch!, extracted)
    } catch (error) {
      throw new Error(
        `展开文件引用失败: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return result
}

/**
 * 从 LLM 响应中提取代码块
 * 
 * 对应 Python 的 _extract_code_block
 */
export function extractCodeBlock(content: string, codeType: string): string | null {
  // 映射代码类型
  const typeMap: Record<string, string> = {
    python: 'python|py',
    powershell: 'powershell|ps1|pwsh',
    bash: 'bash|sh|shell',
  }

  const pattern = typeMap[codeType] || codeType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // 匹配代码块
  const regex = new RegExp(`\`\`\`(?:${pattern})\\n([\\s\\S]*?)\\n\`\`\``, 'g')
  const matches = Array.from(content.matchAll(regex))

  if (matches.length === 0) {
    return null
  }

  // 返回最后一个匹配
  return matches[matches.length - 1]![1]!.trim()
}

/**
 * 智能格式化（截断长文本）
 * 
 * 对应 Python 的 smart_format
 */
export function smartFormat(
  data: string | unknown,
  maxStrLen: number = 100,
  omitStr: string = ' ... '
): string {
  let text = typeof data === 'string' ? data : String(data)

  if (text.length < maxStrLen + omitStr.length * 2) {
    return text
  }

  const half = Math.floor(maxStrLen / 2)
  return `${text.slice(0, half)}${omitStr}${text.slice(-half)}`
}

/**
 * 格式化错误信息
 * 
 * 对应 Python 的 format_error
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    const stack = error.stack || ''
    const lines = stack.split('\n')

    if (lines.length > 1) {
      // 提取第一个有用的堆栈帧
      const frame = lines[1] || ''
      const match = frame.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/)

      if (match) {
        const [, funcName, filePath, line] = match
        const fileName = path.basename(filePath!)
        return `${error.name}: ${error.message} @ ${fileName}:${line}, ${funcName}`
      }
    }

    return `${error.name}: ${error.message}`
  }

  return String(error)
}

/**
 * 消费临时文件（读取后删除）
 * 
 * 对应 Python 的 consume_file
 */
export async function consumeFile(dir: string, fileName: string): Promise<string | null> {
  const filePath = path.join(dir, fileName)

  try {
    await fs.access(filePath)
    const content = await fs.readFile(filePath, 'utf-8')
    await fs.unlink(filePath)
    return content
  } catch {
    return null
  }
}

/**
 * 记录记忆访问统计
 * 
 * 对应 Python 的 log_memory_access
 */
export async function logMemoryAccess(filePath: string): Promise<void> {
  if (!filePath.includes('memory')) {
    return
  }

  const statsFile = path.join(path.dirname(filePath), 'file_access_stats.json')
  const fileName = path.basename(filePath)

  let stats: Record<string, { count: number; last: string }> = {}

  try {
    const content = await fs.readFile(statsFile, 'utf-8')
    stats = JSON.parse(content)
  } catch {
    // 文件不存在或解析失败，使用空对象
  }

  const now = new Date().toISOString().split('T')[0]!
  stats[fileName] = {
    count: (stats[fileName]?.count || 0) + 1,
    last: now,
  }

  await fs.writeFile(statsFile, JSON.stringify(stats, null, 2), 'utf-8')
}

/**
 * 获取全局记忆提示
 * 
 * 对应 Python 的 get_global_memory
 */
export async function getGlobalMemory(scriptDir: string = '.'): Promise<string> {
  let prompt = '\n'

  try {
    const suffix = process.env.GA_LANG === 'en' ? '_en' : ''
    const insightPath = path.join(scriptDir, 'memory/global_mem_insight.txt')
    const structurePath = path.join(scriptDir, `assets/insight_fixed_structure${suffix}.txt`)

    const insight = await fs.readFile(insightPath, 'utf-8')
    const structure = await fs.readFile(structurePath, 'utf-8')

    prompt += `cwd = ${path.join(scriptDir, 'temp')} (./)\n`
    prompt += `\n[Memory] (../memory)\n`
    prompt += structure + '\n../memory/global_mem_insight.txt:\n'
    prompt += insight + '\n'
  } catch {
    // 文件不存在，忽略
  }

  return prompt
}
