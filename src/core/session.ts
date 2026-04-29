/**
 * Session 管理
 * 对应 Python 的 Session 类
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Message } from './types'

/**
 * Session 配置
 */
export interface SessionConfig {
  /** Session ID */
  id: string
  /** 数据目录 */
  dataDir: string
  /** 是否自动保存 */
  autoSave?: boolean
  /** 保存间隔（轮次） */
  saveInterval?: number
}

/**
 * Session 类
 * 管理对话历史和状态持久化
 */
export class Session {
  private config: SessionConfig
  private messages: Message[] = []
  private metadata: Record<string, unknown> = {}
  private turnCount = 0

  constructor(config: SessionConfig) {
    this.config = {
      autoSave: true,
      saveInterval: 5,
      ...config,
    }
  }

  /**
   * 获取 Session ID
   */
  getId(): string {
    return this.config.id
  }

  /**
   * 获取消息历史
   */
  getMessages(): Message[] {
    return [...this.messages]
  }

  /**
   * 添加消息
   */
  addMessage(message: Message): void {
    this.messages.push(message)
  }

  /**
   * 批量添加消息
   */
  addMessages(messages: Message[]): void {
    this.messages.push(...messages)
  }

  /**
   * 清空消息历史
   */
  clearMessages(): void {
    this.messages = []
  }

  /**
   * 获取元数据
   */
  getMetadata(): Record<string, unknown> {
    return { ...this.metadata }
  }

  /**
   * 设置元数据
   */
  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value
  }

  /**
   * 增加轮次计数
   */
  incrementTurn(): void {
    this.turnCount++

    // 自动保存
    if (
      this.config.autoSave &&
      this.config.saveInterval &&
      this.turnCount % this.config.saveInterval === 0
    ) {
      this.save().catch((error) => {
        console.error('[Session] Auto-save failed:', error)
      })
    }
  }

  /**
   * 获取轮次计数
   */
  getTurnCount(): number {
    return this.turnCount
  }

  /**
   * 保存 Session 到磁盘
   */
  async save(): Promise<void> {
    const sessionDir = join(this.config.dataDir, 'sessions')
    await mkdir(sessionDir, { recursive: true })

    const sessionFile = join(sessionDir, `${this.config.id}.json`)
    const data = {
      id: this.config.id,
      messages: this.messages,
      metadata: this.metadata,
      turnCount: this.turnCount,
      savedAt: Date.now(),
    }

    await writeFile(sessionFile, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`[Session] Saved to ${sessionFile}`)
  }

  /**
   * 从磁盘加载 Session
   */
  async load(): Promise<void> {
    const sessionFile = join(this.config.dataDir, 'sessions', `${this.config.id}.json`)

    try {
      const content = await readFile(sessionFile, 'utf-8')
      const data = JSON.parse(content)

      this.messages = data.messages || []
      this.metadata = data.metadata || {}
      this.turnCount = data.turnCount || 0

      console.log(`[Session] Loaded from ${sessionFile}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[Session] No existing session found, starting fresh`)
      } else {
        throw error
      }
    }
  }

  /**
   * 压缩历史消息
   * 对应 Python 的 compress_history_tags
   */
  compressHistory(keepRecent: number = 10, maxLen: number = 800): void {
    const patterns = [
      /<thinking>[\s\S]*?<\/thinking>/g,
      /<tool_use>[\s\S]*?<\/tool_use>/g,
      /<tool_result>[\s\S]*?<\/tool_result>/g,
    ]

    const truncateString = (s: string): string => {
      if (s.length <= maxLen) return s
      return s.slice(0, maxLen / 2) + '\n...[Truncated]...\n' + s.slice(-maxLen / 2)
    }

    // 只压缩旧消息，保留最近的消息
    for (let i = 0; i < this.messages.length - keepRecent; i++) {
      const msg = this.messages[i]
      if (!msg) continue

      let content = msg.content

      // 压缩标签内容
      for (const pattern of patterns) {
        content = content.replace(pattern, (match) => {
          const truncated = truncateString(match)
          return truncated
        })
      }

      msg.content = content
    }

    console.log(`[Session] Compressed history, kept recent ${keepRecent} messages`)
  }

  /**
   * 修剪历史消息
   * 对应 Python 的 trim_messages_history
   */
  trimHistory(contextWindow: number): void {
    const cost = this.messages.reduce((sum, m) => sum + JSON.stringify(m).length, 0)

    console.log(`[Session] Current context: ${cost} chars, ${this.messages.length} messages`)

    if (cost > contextWindow * 3) {
      // 先压缩
      this.compressHistory(4)

      const target = contextWindow * 3 * 0.6

      // 移除旧消息（保留系统消息）
      while (this.messages.length > 5 && cost > target) {
        const firstNonSystem = this.messages.findIndex((m) => m.role !== 'system')
        if (firstNonSystem > 0) {
          this.messages.splice(firstNonSystem, 1)
        } else {
          break
        }
      }

      const newCost = this.messages.reduce((sum, m) => sum + JSON.stringify(m).length, 0)
      console.log(`[Session] Trimmed context: ${newCost} chars, ${this.messages.length} messages`)
    }
  }
}

/**
 * Session 管理器
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map()
  private dataDir: string

  constructor(dataDir: string) {
    this.dataDir = dataDir
  }

  /**
   * 创建新 Session
   */
  create(id?: string): Session {
    const sessionId = id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const session = new Session({
      id: sessionId,
      dataDir: this.dataDir,
    })

    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * 获取 Session
   */
  get(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  /**
   * 加载 Session
   */
  async load(id: string): Promise<Session> {
    let session = this.sessions.get(id)

    if (!session) {
      session = new Session({
        id,
        dataDir: this.dataDir,
      })
      this.sessions.set(id, session)
    }

    await session.load()
    return session
  }

  /**
   * 保存所有 Session
   */
  async saveAll(): Promise<void> {
    const promises = Array.from(this.sessions.values()).map((s) => s.save())
    await Promise.all(promises)
  }

  /**
   * 删除 Session
   */
  delete(id: string): void {
    this.sessions.delete(id)
  }

  /**
   * 列出所有 Session
   */
  list(): string[] {
    return Array.from(this.sessions.keys())
  }
}
