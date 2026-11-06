import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'

const PANE = 'usage-bar'
const usage = atom({ plugin: 'usage-bar', key: 'usage' } as const, null)

const toUsage = (context: SessionContextUsage, limits: SessionRateLimit[]): Usage => {
  const five = limits.find(one => one.kind === 'five_hour')
  const seven = limits.find(one => one.kind === 'seven_day')

  return {
    tokens: context.tokens,
    window: context.window,
    percent: context.percent,
    fiveHour: five && { percent: five.percentUsed, resetsAt: five.resetsAt },
    sevenDay: seven && { percent: seven.percentUsed, resetsAt: seven.resetsAt },
  }
}

// 여유 50% 미만, 주의 80% 미만, 그 위는 위험
// VS Code 테마에서 'warning'이 회색으로 나와서 노란색은 직접 지정한다
const tone = (pct: number) => (pct >= 80 ? 'error' : pct >= 50 ? '#E5B93C' : 'success')
const CELLS = 7
const gauge = (pct: number) => {
  const filled = Math.round((Math.min(pct, 100) / 100) * CELLS)

  return '▰'.repeat(filled) + '▱'.repeat(CELLS - filled)
}
const untilReset = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  const hours = Math.floor(minutes / 60)

  return hours >= 24
    ? `↻${Math.floor(hours / 24)}d${hours % 24}h`
    : `↻${hours}h${minutes % 60}m`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'usage-bar',
      description: '컨텍스트·5시간·일주일 한도 게이지 패널 열기',
    })
    const now = await $.session.usage()
    await update($, usage, () => toUsage(now.context, now.rateLimits))
    void $.ui.status(undefined)
    void $.ui.open({ id: PANE, title: '사용량' })

    return next(e)
  })

  on('command.run', { command: 'usage-bar' }, async $ => {
    await $.ui.open({ id: PANE, title: '사용량' })

    return { text: '사용량 패널을 열었어요.' }
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e.context, e.rateLimits))

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const u = await read($, usage)
    const now = await $.clock.now()
    const limit = (name: string, value: Usage['fiveHour']) => (
      <Box>
        <Text weight="bold">{name} </Text>
        {value === undefined ? (
          <Text dimColor>-</Text>
        ) : (
          <Text>
            <Text color={tone(value.percent)}>{gauge(value.percent)} </Text>
            <Text color={tone(value.percent)} weight="bold" tabular>
              {Math.round(value.percent)}%
            </Text>
            <Text dimColor> {untilReset(value.resetsAt, now)}</Text>
          </Text>
        )}
      </Box>
    )

    return (
      <Box flexDirection="row">
        <Box>
          <Text weight="bold">CONTEXT </Text>
          {u?.percent === undefined ? (
            <Text dimColor>-</Text>
          ) : (
            <Text>
              <Text color={tone(u.percent)}>{gauge(u.percent)} </Text>
              <Text color={tone(u.percent)} weight="bold" tabular>
                {u.percent}%
              </Text>
            </Text>
          )}
        </Box>
        <Text dimColor>{'  │  '}</Text>
        {limit('5H', u?.fiveHour)}
        <Text dimColor>{'  │  '}</Text>
        {limit('7D', u?.sevenDay)}
      </Box>
    )
  })
}
