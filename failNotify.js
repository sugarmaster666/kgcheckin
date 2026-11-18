// 工作流失败兜底通知：仅在 main.js 未能发出通知（异常退出/崩溃/超时/依赖安装失败）时使用。
// 由 签到.yml 中 `if: failure()` 的步骤调用，并跳过已有 .notify-sent 标记的情况。
import fs from 'node:fs'
import { sendNotify } from './utils/notify.js'

function shanghaiDate() {
  const t = new Date(Date.now() + 8 * 3600 * 1000)
  return t.toISOString().slice(0, 10)
}

async function main() {
  // main.js 已经成功发过通知就不再重复发送
  if (fs.existsSync('.notify-sent')) {
    console.log('本次运行已发送过通知，跳过兜底通知')
    return
  }

  const repo = process.env.GITHUB_REPOSITORY || '未知'
  const runId = process.env.GITHUB_RUN_ID || ''
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const runUrl = runId ? `${server}/${repo}/actions/runs/${runId}` : '(未知)'

  const title = `❌ 酷狗签到失败 ${shanghaiDate()}`
  const content = [
    '酷狗概念VIP自动签到运行失败。',
    '',
    `仓库: ${repo}`,
    `触发方式: ${process.env.GITHUB_EVENT_NAME || '未知'}`,
    `运次链接: ${runUrl}`,
    '',
    '常见原因：',
    '  1) 酷狗登录 token 过期或账号异常 → 重新运行「二维码登录」工作流',
    '  2) 酷狗接口临时异常/限流 → 通常次日自动恢复',
    '  3) 当日 VIP 名额已被 APP 内手动领取 → 属正常冲突，非故障',
    '  4) GitHub Actions 运行器网络问题 → 可手动重跑一次',
    '',
    '请点击上方运次链接查看详细日志。',
  ].join('\n')

  const result = await sendNotify(title, content)
  if (!result || result.configured === 0) {
    console.log('未配置任何通知渠道，跳过兜底通知')
    return
  }
  console.log(`兜底通知已发送: ${result.success} 成功, ${result.fail} 失败`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('兜底通知发送失败:', e && e.message ? e.message : e)
  process.exit(0) // 兜底通知自身失败不改变工作流原有的失败结论
})
