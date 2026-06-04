import {
  Children,
  cloneElement,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
} from 'react'
import type { CeorlShellHandle, CeorlShellProps } from './types'
import { CeorlColumn } from './Column'
import { useScrollSettle } from '../hooks/useScrollSettle'

/**
 * CeorlShell — 顶层横向滚动容器
 *
 * 受控/非受控双模式：传 activeIndex 为受控模式，传 defaultActiveIndex 为非受控。
 * columns prop 与 children 二选一，columns 优先。
 * 通过 ref 暴露 focusColumn（最小滚动聚焦）和 getColumns（DOM 查询）。
 */
export const CeorlShell = forwardRef<
  CeorlShellHandle,
  CeorlShellProps & HTMLAttributes<HTMLDivElement>
>(function CeorlShell(
  {
    children,
    activeIndex: controlledIndex,
    defaultActiveIndex = 0,
    onIndexChange,
    columns,
    className = '',
    style,
    ...props
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isControlled = controlledIndex !== undefined

  const [internalIndex, setInternalIndex] = useState(defaultActiveIndex)
  const activeIndex = controlledIndex ?? internalIndex

  // 序列计数器，每次 doFocus 自增，用于丢弃过时的滚动停稳回调
  const focusSeqRef = useRef(0)

  const updateIndex = useCallback(
    (index: number) => {
      if (isControlled) {
        onIndexChange?.(index)
      } else {
        setInternalIndex(index)
        onIndexChange?.(index)
      }
    },
    [isControlled, onIndexChange],
  )

  // 滚动停稳回调 — 只接受当前序列号之后的回调，防止 focusColumn 快速调用产生过时事件
  const handleScrollSettle = useCallback(
    (index: number, seq: number) => {
      if (seq < focusSeqRef.current) return
      updateIndex(index)
    },
    [updateIndex],
  )

  useScrollSettle(containerRef, { onScrollSettle: handleScrollSettle })

  // 只有稳定 ref（containerRef、focusSeqRef），省略 deps 安全
  // L/R 双面吸附：L=右吸附面（列右边缘对齐视口右边缘），R=左吸附面（列左边缘对齐视口左边缘）
  // 选离当前位置更近的面，实现最小滚动
  const doFocus = useCallback(
    (targetIndex: number) => {
      const container = containerRef.current
      if (!container || targetIndex < 0) return
      const cols = container.querySelectorAll('.ceorl-column')
      if (targetIndex >= cols.length) return

      focusSeqRef.current += 1
      const col = cols[targetIndex] as HTMLElement

      const viewLeft = container.scrollLeft
      const viewRight = viewLeft + container.clientWidth
      const colLeft = col.offsetLeft
      const colRight = colLeft + col.offsetWidth

      if (colLeft >= viewLeft && colRight <= viewRight) return

      const L = Math.max(0, colRight - container.clientWidth)
      const R = colLeft

      const target = Math.abs(container.scrollLeft - L) <= Math.abs(container.scrollLeft - R)
        ? L
        : R

      container.scrollTo({ left: target, behavior: 'smooth' })
    },
    [],
  )

  const getColumns = useCallback((): HTMLDivElement[] => {
    if (!containerRef.current) return []
    return Array.from(containerRef.current.querySelectorAll('.ceorl-column'))
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      focusColumn: (index: number) => {
        doFocus(index)
      },
      getColumns,
      get scrollElement() { return containerRef.current },
    }),
    [getColumns, doFocus],
  )

  const renderColumns = () => {
    if (columns) {
      return columns.map((col, i) => (
        <CeorlColumn
          key={col.id}
          width={col.width}
          data-active={i === activeIndex ? 'true' : undefined}
        >
          {col.content}
        </CeorlColumn>
      ))
    }
    if (Children.count(children) === 0) return null
    return Children.map(children, (child, i) => {
      if (typeof child === 'object' && child !== null && 'type' in child) {
        return cloneElement(child as ReactElement<{ 'data-active'?: string }>, {
          'data-active': i === activeIndex ? 'true' : undefined,
        })
      }
      return child
    })
  }

  return (
    <div
      ref={containerRef}
      className={`ceorl-shell${className ? ' ' + className : ''}`}
      style={{
        width: '100vw',
        height: '100vh',
        ...style,
      }}
      {...props}
    >
      {renderColumns()}
    </div>
  )
})
