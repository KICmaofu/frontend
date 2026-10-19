import { useEffect, useRef, useState } from 'react'

// ── 打字机效果: 让"显示节奏"与"网络节奏"解耦 ────────────────
// 流式响应的文本按服务端/网络的节奏成块到达(块大小 1~5 字不等, 间隔忽长忽短),
// 直接拼到屏幕上会一顿一顿。做法:
//   ① 收到的文本先进队列(在 targetRef 里拼接成"目标文本"), 不直接上屏
//   ② 定时器每 intervalMs 把队列里的字符逐个"打"到屏幕上
//   ③ 流结束后队列里可能还有积压, 继续打完整个过程才算 done
// 过程量(目标文本/已打字符数/定时器)都放在 ref 里: 它们只在定时器和事件回调中
// 读写, 不参与渲染(在渲染期间访问 ref 会触发 React Compiler 相关 lint 警告)

export interface Typewriter {
  /** 已输出的文本: 渲染它 */
  typed: string
  /** 队列中积压的字符数(用于把"收到快、输出慢"可视化) */
  pending: number
  /** 流已结束且积压已全部输出完 */
  done: boolean
  /** 收到一段流式文本时调用 */
  push: (chunk: string) => void
  /** 流结束时调用: 标记录入完成, 等队列清空后 done 变为 true */
  finish: () => void
  /** 清空并停止, 准备开启新一轮输出 */
  reset: () => void
}

export function useTypewriter(intervalMs = 24): Typewriter {
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(0)
  const [done, setDone] = useState(false)

  const targetRef = useRef('') // 截至此刻已收到的完整文本
  const typedCountRef = useRef(0) // 已输出的字符数
  const streamEndedRef = useRef(false) // 流是否已结束
  const timerRef = useRef<number | null>(null) // 正在跑的 setInterval(没有则为 null)

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // 定时器体: 每次输出一个字符; 已追上目标时, 流结束就收工, 否则先暂停
  const tick = () => {
    const target = targetRef.current
    if (typedCountRef.current >= target.length) {
      stopTimer()
      if (streamEndedRef.current) setDone(true)
      return
    }

    typedCountRef.current += 1
    setTyped(target.slice(0, typedCountRef.current))
    setPending(target.length - typedCountRef.current)
  }

  // 有字符可打、但定时器没转时把它转起来(出字速度由这里的 intervalMs 决定)
  const ensureTimer = () => {
    if (timerRef.current === null) {
      timerRef.current = window.setInterval(tick, intervalMs)
    }
  }

  const push = (chunk: string) => {
    targetRef.current += chunk
    setPending(targetRef.current.length - typedCountRef.current)
    ensureTimer()
  }

  const finish = () => {
    streamEndedRef.current = true
    // 此刻队列可能已清空且定时器已停下: 重新拉起, 让 tick 再跑一次收尾检查
    ensureTimer()
  }

  const reset = () => {
    stopTimer()
    targetRef.current = ''
    typedCountRef.current = 0
    streamEndedRef.current = false
    setTyped('')
    setPending(0)
    setDone(false)
  }

  // 卸载时清理定时器, 避免向已卸载的组件推送状态
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    },
    [],
  )

  return { typed, pending, done, push, finish, reset }
}
