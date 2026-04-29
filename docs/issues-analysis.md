# GenericAgent 未解决问题分析

> 基于 GitHub Issues 分析（截至 2026-04-28）

## 🔴 P0 - 安全与架构问题

### 1. Indirect Prompt Injection 风险 (#204)
**严重性**: CRITICAL (CVSS 9.1)

**问题描述**:
- `tool_result` 直接注入 LLM 上下文，无信任边界标记
- `skill_search` 自动调用远程服务（`http://www.fudankw.cn:58787`），返回内容未经可信度验证
- 潜在攻击链：恶意 skill description → LLM 误判为指令 → `code_run` 执行 → RCE

**受影响工具**:
- `code_run` - 子进程 stdout 可控
- `web_scan` / `web_execute_js` - 网页内容可控
- `file_read` - 文件内容可控
- `skill_search` - 远程 API 返回可控

**修复建议**:
```python
# 方案 1: tool_result 统一包裹
tool_results.append({
    'tool_use_id': tid,
    'content': f'<UNTRUSTED_TOOL_OUTPUT>\n{datastr}\n</UNTRUSTED_TOOL_OUTPUT>'
})
```

```python
# 方案 2: code_run 强制确认
if tool_name == 'code_run' and not user_confirmed:
    return StepOutcome(None, next_prompt='ask_user: 是否执行代码？')
```

**TypeScript 重构时的改进**:
- 使用 Zod schema 验证工具返回值
- 实现沙箱执行环境（VM2 或 isolated-vm）
- 添加 `trustLevel` 字段标记数据来源

---

### 2. 隐私泄露：环境指纹上传 (#204)
**严重性**: HIGH

**问题描述**:
- `skill_search` 默认上传完整环境信息（OS、shell、Python 版本、已安装工具）
- HTTP 明文传输（非 HTTPS）
- 用户无感知，无 opt-out 机制
- 通过 `subprocess.run` 执行，主进程 monkey-patch 无法拦截

**采集内容**:
```python
{
    "os": "Windows-10-10.0.19045-SP0",
    "shell": "powershell",
    "python_version": "3.11.5",
    "runtimes": ["node", "python3", "java"],
    "tools": ["git", "docker", "curl"]
}
```

**修复建议**:
- 默认不采集环境信息
- 客户端本地过滤（仅上传 skill 依赖检查结果）
- 改用 HTTPS
- 首次使用强制 opt-in

**TypeScript 重构时的改进**:
- 环境检测本地化（不上传）
- 使用 HTTPS + 证书校验
- 配置文件显式声明 `enableTelemetry: false`

---

## 🟡 P1 - 功能与体验问题

### 3. 上下文窗口管理混乱 (#202)
**问题**: `trim_messages_history` 中 `context_win * 3` 的逻辑不清晰

**现状**:
```python
if cost > context_win * 3:
    compress_history_tags(history, keep_recent=4, force=True)
    target = context_win * 3 * 0.6
```

**问题**:
- 为什么是 3 倍？
- 为什么压缩目标是 `3 * 0.6 = 1.8` 倍？
- `context_win` 是否还有其他用途？

**TypeScript 重构时的改进**:
- 明确定义 `maxContextTokens` 和 `compressionThreshold`
- 使用 tiktoken 精确计算 token 数（而非字符数）
- 实现滑动窗口 + 重要消息保留策略

---

### 4. 定时任务无通知 (#206)
**问题**: 定时任务执行完成后前端无感知

**现状**:
- 任务结果写入 `sche_tasks/done/`
- 用户需手动查看文件或询问 Agent

**修复建议**:
- 添加 WebSocket 推送通知
- 前端显示任务状态面板
- 支持邮件/Webhook 通知

**TypeScript 重构时的改进**:
- 使用 EventEmitter 实现任务状态广播
- 前端 SSE 订阅任务更新
- 集成通知服务（Telegram Bot / Email）

---

### 5. 技能与记忆迁移困难 (#211)
**场景 1**: 多设备间同步技能/记忆  
**场景 2**: 升级官方版本时保留本地数据

**问题**:
- 缺少明确的数据目录结构文档
- 不清楚哪些文件应该 `.gitignore`
- 没有导入/导出工具

**修复建议**:
```bash
# 需要同步的目录
memory/          # 记忆层
sche_tasks/      # 定时任务
mykey.py         # 配置文件

# 应该 .gitignore 的
temp/            # 临时文件
*.log            # 日志
__pycache__/     # Python 缓存
```

**TypeScript 重构时的改进**:
- 统一数据目录：`~/.generic-agent/`
- 提供 CLI 命令：`ga export` / `ga import`
- 支持云同步（可选）

---

### 6. 微信 /help 指令泄露敏感信息 (#213)
**问题**: `/help` 返回配置文件和记忆文件路径

**风险**:
- 暴露系统路径
- 可能泄露 API Key（如果配置文件权限不当）

**修复建议**:
- `/help` 仅返回可用命令列表
- 添加 `/debug` 命令（需管理员权限）返回详细信息

---

## 🟢 P2 - 配置与兼容性问题

### 7. WSL 环境启动失败 (#194)
**问题**: WSL 环境下出现 404 和 500 错误

**可能原因**:
- 浏览器驱动路径问题
- 网络配置冲突
- 文件权限问题

**TypeScript 重构时的改进**:
- 使用 Playwright（自动管理浏览器）
- 提供 Docker 镜像（统一环境）

---

### 8. Windows pythonnet 兼容性 (#136)
**问题**: pythonnet 默认使用 netfx，Windows 上可能失败

**TypeScript 重构时的改进**:
- 移除 Python 特定依赖
- 使用跨平台的 Node.js 原生模块

---

### 9. 飞书新对话报错 (#150)
**问题**: 飞书 Bot 开启新对话时报错

**可能原因**:
- 会话状态管理问题
- 飞书 API 版本兼容性

**TypeScript 重构时的改进**:
- 使用官方 SDK（`@larksuiteoapi/node-sdk`）
- 实现会话状态持久化（Redis/SQLite）

---

### 10. 模型路由配置不清晰 (#181)
**问题**: 不知道如何配置多模型路由

**修复建议**:
```python
# mykey.py
model_router = {
    "default": "claude-3-5-sonnet",
    "vision": "gpt-4-vision",
    "code": "claude-3-opus"
}
```

**TypeScript 重构时的改进**:
- 配置文件支持 YAML/TOML
- 提供 Web UI 配置界面

---

### 11. 项目级启动 (#178)
**问题**: 不知道如何在特定项目中启动 Agent

**修复建议**:
```bash
cd /path/to/project
ga start --workspace .
```

**TypeScript 重构时的改进**:
- 支持 `.generic-agent.config.js`
- 自动检测项目根目录（类似 Git）

---

### 12. LLM 空响应循环 (#201)
**问题**: 一直打印 `[Warn] LLM returned an empty response. Retrying...`

**可能原因**:
- API 限流
- 网络超时
- 模型返回格式错误

**修复建议**:
- 添加最大重试次数
- 指数退避策略
- 详细错误日志

**TypeScript 重构时的改进**:
- 使用 `p-retry` 库
- 实现断路器模式（Circuit Breaker）

---

### 13. UI 状态不持久化 (#200)
**问题**: 窗口大小、侧边栏状态、模型选择不记忆

**TypeScript 重构时的改进**:
- 使用 localStorage 持久化 UI 状态
- 支持多配置文件（Profile）

---

## 📊 问题优先级总结

| 优先级 | 数量 | 关键问题 |
|--------|------|----------|
| P0 | 2 | Prompt Injection、隐私泄露 |
| P1 | 5 | 上下文管理、任务通知、数据迁移 |
| P2 | 6 | 环境兼容性、配置优化 |

---

## 🎯 TypeScript 重构时的核心改进方向

### 安全
- ✅ 沙箱执行环境（VM2 / isolated-vm）
- ✅ 工具返回值信任边界标记
- ✅ Zod schema 验证
- ✅ HTTPS + 证书校验

### 性能
- ✅ 精确 token 计数（tiktoken）
- ✅ 流式响应优化（AsyncIterator）
- ✅ 并发工具调用

### 体验
- ✅ 统一数据目录
- ✅ CLI 导入/导出
- ✅ Web UI 配置界面
- ✅ 实时任务通知

### 兼容性
- ✅ 跨平台浏览器自动化（Playwright）
- ✅ Docker 镜像
- ✅ 官方 Bot SDK

---

## 参考资料
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Spotlighting: Adversarial Training for Conversational AI](https://arxiv.org/abs/2402.06363)
- [GenericAgent Issues](https://github.com/lsdefine/GenericAgent/issues)
