import type { ReactNode } from 'react'

/** 标准宽度档位 */
export type ColumnWidth = '1/2' | '1/3' | '1/4' | '1/6'

export interface ColumnDescriptor {
  id: string
  width?: ColumnWidth
  content: ReactNode
}

export interface CeorlShellHandle {
  focusColumn: (index: number) => void
  getColumns: () => HTMLDivElement[]
  scrollElement: HTMLDivElement | null
}

export interface CeorlShellProps {
  children?: ReactNode
  activeIndex?: number
  defaultActiveIndex?: number
  onIndexChange?: (index: number) => void
  columns?: readonly ColumnDescriptor[]
}

export interface CeorlColumnProps {
  /** 列宽度档位 */
  width?: ColumnWidth
  children?: ReactNode
  /** 列内边距 (CSS padding 值) */
  padding?: string
}

export interface CeorlStackProps {
  children?: ReactNode
}

/** 宽度档位到 CSS 值的映射 */
export const WIDTH_MAP: Record<ColumnWidth, string> = {
  '1/2': '50%',
  '1/3': '33.333%',
  '1/4': '25%',
  '1/6': '16.666%',
}
