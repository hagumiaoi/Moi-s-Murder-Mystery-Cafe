import type { HTMLAttributes } from 'react'
import type { CeorlColumnProps } from './types'
import { WIDTH_MAP } from './types'

/**
 * CeorlColumn — 单列容器
 *
 * 一个窗口 = 一列。通过 data-width 属性控制宽度档位（1/2, 1/3, 1/4）。
 * 列内可放置任意内容，或嵌套 CeorlStack 实现纵向分割。
 */
export function CeorlColumn({
  width = '1/3',
  children,
  padding,
  style,
  ...props
}: CeorlColumnProps & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="ceorl-column"
      data-width={width}
      style={{ ...style, width: WIDTH_MAP[width] }}
      {...props}
    >
      <div className="ceorl-column-inner" style={padding != null ? { padding } : undefined}>
        {children}
      </div>
    </div>
  )
}
