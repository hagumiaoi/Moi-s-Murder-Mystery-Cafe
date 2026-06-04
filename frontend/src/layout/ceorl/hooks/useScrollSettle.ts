import { useCallback, useEffect, useRef, type RefObject } from 'react'

export interface ScrollSettleOptions {
  onScrollSettle?: (index: number, seq: number) => void
}

/**
 * useScrollSettle — 滚动停稳检测
 *
 * 监听容器的 scroll 事件，在滚动停止后计算当前可见列的索引。
 * 支持两层策略：支持 scrollend 的浏览器优先用 scrollend 事件，
 * 不支持的浏览器回退到 300ms 防抖。
 * 通过 onScrollSettle 回调报告 (列索引, 序列号)，调用方可丢弃过时事件。
 */
export function useScrollSettle(
  containerRef: RefObject<HTMLDivElement | null>,
  options?: ScrollSettleOptions,
) {
  const onScrollSettleRef = useRef(options?.onScrollSettle)

  useEffect(() => {
    onScrollSettleRef.current = options?.onScrollSettle
  })

  const seqRef = useRef(0)
  const scrollingRef = useRef(false)

  // 根据 scrollLeft 累积偏移计算当前完全可见的列索引
  const computeIndex = useCallback((el: HTMLDivElement) => {
    const cols = el.querySelectorAll('.ceorl-column')
    if (cols.length === 0) return 0
    let accum = 0
    for (let i = 0; i < cols.length; i++) {
      accum += (cols[i] as HTMLElement).offsetWidth
      if (el.scrollLeft < accum - 1) {
        return i
      }
    }
    return cols.length - 1
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const supportsScrollend = 'onscrollend' in el

    const handleSettle = () => {
      const idx = computeIndex(el)
      scrollingRef.current = false
      onScrollSettleRef.current?.(idx, seqRef.current)
    }

    // scrollend 原生事件 — 更精确，先清定时器防止双发
    const handleScrollend = () => {
      clearTimeout(scrollTimer)
      handleSettle()
    }

    if (supportsScrollend) {
      el.addEventListener('scrollend', handleScrollend)
    }

    let scrollTimer: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      if (!scrollingRef.current) {
        seqRef.current += 1
        scrollingRef.current = true
      }
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(handleSettle, 300)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (supportsScrollend) {
        el.removeEventListener('scrollend', handleScrollend)
      }
      el.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimer)
    }
  }, [containerRef, computeIndex])
}
