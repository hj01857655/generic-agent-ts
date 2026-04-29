/**
 * 基础功能测试（不依赖编译）
 */

console.log('🧪 测试基础类型定义...')

// 测试类型导入
try {
  const types = await import('./src/core/types.ts')
  console.log('✅ 类型定义加载成功')
  console.log('   - TrustLevel:', Object.keys(types.TrustLevel))
} catch (error) {
  console.error('❌ 类型定义加载失败:', error.message)
}

console.log('\n🧪 测试工具基类...')

try {
  const { BaseTool } = await import('./src/tools/base.ts')
  console.log('✅ 工具基类加载成功')
} catch (error) {
  console.error('❌ 工具基类加载失败:', error.message)
}

console.log('\n🧪 测试配置管理...')

try {
  // 设置测试环境变量
  process.env.LLM_PROVIDER = 'claude'
  process.env.ANTHROPIC_API_KEY = 'test-key'
  
  const { loadConfig } = await import('./src/utils/config.ts')
  const config = loadConfig()
  console.log('✅ 配置加载成功')
  console.log('   - Provider:', config.provider)
  console.log('   - Model:', config.model)
  console.log('   - Max Turns:', config.max_turns)
} catch (error) {
  console.error('❌ 配置加载失败:', error.message)
}

console.log('\n✨ 基础测试完成！')
