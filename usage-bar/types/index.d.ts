export type Usage = {
  tokens?: number
  window: number
  percent?: number
  fiveHour?: { percent: number; resetsAt?: string }
  sevenDay?: { percent: number; resetsAt?: string }
}

declare module 'claude-code' {
  interface PluginState {
    'usage-bar': { usage: Usage | null }
  }
}
