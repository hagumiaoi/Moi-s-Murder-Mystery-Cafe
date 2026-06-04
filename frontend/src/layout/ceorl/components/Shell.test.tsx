import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CeorlShell } from './Shell'
import { CeorlColumn } from './Column'
import type { CeorlShellHandle } from './types'
import { createRef } from 'react'

describe('CeorlShell', () => {
  it('renders children inside .ceorl-shell container', () => {
    render(
      <CeorlShell>
        <CeorlColumn>Panel A</CeorlColumn>
        <CeorlColumn>Panel B</CeorlColumn>
      </CeorlShell>,
    )
    expect(screen.getByText('Panel A')).toBeInTheDocument()
    expect(screen.getByText('Panel B')).toBeInTheDocument()
    expect(document.querySelector('.ceorl-shell')).toBeInTheDocument()
  })

  it('renders columns from columns prop', () => {
    render(
      <CeorlShell
        columns={[
          { id: 'a', content: 'Column A' },
          { id: 'b', content: 'Column B', width: '1/2' },
        ]}
      />,
    )
    expect(screen.getByText('Column A')).toBeInTheDocument()
    expect(screen.getByText('Column B')).toBeInTheDocument()
    const cols = document.querySelectorAll('.ceorl-column')
    expect(cols).toHaveLength(2)
    expect(cols[1]).toHaveAttribute('data-width', '1/2')
  })

  it('columns prop takes precedence over children', () => {
    render(
      <CeorlShell
        columns={[{ id: 'a', content: 'From Column' }]}
      >
        <CeorlColumn>From Child</CeorlColumn>
      </CeorlShell>,
    )
    expect(screen.getByText('From Column')).toBeInTheDocument()
    expect(screen.queryByText('From Child')).not.toBeInTheDocument()
  })

  it('renders empty shell with empty columns array', () => {
    render(<CeorlShell columns={[]} />)
    expect(document.querySelector('.ceorl-shell')).toBeInTheDocument()
    expect(document.querySelectorAll('.ceorl-column')).toHaveLength(0)
  })

  it('forwardRef exposes CeorlShellHandle', () => {
    const ref = createRef<CeorlShellHandle>()
    render(
      <CeorlShell ref={ref}>
        <CeorlColumn>Test</CeorlColumn>
      </CeorlShell>,
    )
    expect(ref.current).not.toBeNull()
    expect(typeof ref.current?.focusColumn).toBe('function')
    expect(typeof ref.current?.getColumns).toBe('function')
    expect(ref.current?.scrollElement).toBeInstanceOf(HTMLDivElement)
  })

  it('exposes getColumns via ref handle', () => {
    const ref = createRef<CeorlShellHandle>()
    render(
      <CeorlShell ref={ref}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
      </CeorlShell>,
    )
    const cols = ref.current?.getColumns()
    expect(cols).toHaveLength(2)
    expect(cols?.[0]).toBeInstanceOf(HTMLDivElement)
  })

  it('focusColumn does not throw on invalid index', () => {
    const ref = createRef<CeorlShellHandle>()
    render(
      <CeorlShell ref={ref}>
        <CeorlColumn>A</CeorlColumn>
      </CeorlShell>,
    )
    expect(() => ref.current?.focusColumn(-1)).not.toThrow()
    expect(() => ref.current?.focusColumn(999)).not.toThrow()
  })

  it('renders children when value is 0 (falsy but valid React node)', () => {
    render(<CeorlShell>{0}</CeorlShell>)
    expect(document.querySelector('.ceorl-shell')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('defaultActiveIndex sets initial active column', () => {
    render(
      <CeorlShell defaultActiveIndex={1}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
        <CeorlColumn>C</CeorlColumn>
      </CeorlShell>,
    )
    const cols = document.querySelectorAll('.ceorl-column')
    expect(cols[0]).not.toHaveAttribute('data-active')
    expect(cols[1]).toHaveAttribute('data-active', 'true')
    expect(cols[2]).not.toHaveAttribute('data-active')
  })

  it('has default width 100vw and height 100vh as inline styles', () => {
    const { container } = render(
      <CeorlShell>
        <CeorlColumn>Test</CeorlColumn>
      </CeorlShell>,
    )
    const shell = container.querySelector('.ceorl-shell') as HTMLElement
    expect(shell.style.width).toBe('100vw')
    expect(shell.style.height).toBe('100vh')
  })

  it('consumer style overrides default dimensions', () => {
    const { container } = render(
      <CeorlShell style={{ height: 'calc(100vh - 64px)', width: '800px' }}>
        <CeorlColumn>Test</CeorlColumn>
      </CeorlShell>,
    )
    const shell = container.querySelector('.ceorl-shell') as HTMLElement
    expect(shell.style.height).toBe('calc(100vh - 64px)')
    expect(shell.style.width).toBe('800px')
  })

  it('applies data-active to active column in columns mode', () => {
    render(
      <CeorlShell
        columns={[
          { id: 'a', content: 'A' },
          { id: 'b', content: 'B' },
        ]}
        activeIndex={1}
      />,
    )
    const cols = document.querySelectorAll('.ceorl-column')
    expect(cols[0]).not.toHaveAttribute('data-active')
    expect(cols[1]).toHaveAttribute('data-active', 'true')
  })

  it('applies data-active to active column in children mode', () => {
    render(
      <CeorlShell activeIndex={0}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
      </CeorlShell>,
    )
    const cols = document.querySelectorAll('.ceorl-column')
    expect(cols[0]).toHaveAttribute('data-active', 'true')
    expect(cols[1]).not.toHaveAttribute('data-active')
  })

  it('focusColumn picks L when right snap face is closer', () => {
    const ref = createRef<CeorlShellHandle>()
    const { container } = render(
      <CeorlShell ref={ref}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
      </CeorlShell>,
    )
    const shell = container.querySelector('.ceorl-shell') as HTMLElement
    shell.scrollTo = vi.fn()
    Object.defineProperty(shell, 'scrollLeft', { value: 50 })
    Object.defineProperty(shell, 'clientWidth', { value: 1000 })

    const cols = shell.querySelectorAll('.ceorl-column')
    Object.defineProperty(cols[0], 'offsetLeft', { value: 0 })
    Object.defineProperty(cols[1], 'offsetLeft', { value: 800 })
    Object.defineProperty(cols[1], 'offsetWidth', { value: 400 })

    // col1: colRight=1200 > viewRight=1050，L=max(0,1200-1000)=200，R=800
    // |50-200|=150 < |50-800|=750 → L=200
    ref.current?.focusColumn(1)
    expect(shell.scrollTo).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' })
  })

  it('focusColumn picks R when left snap face is closer', () => {
    const ref = createRef<CeorlShellHandle>()
    const { container } = render(
      <CeorlShell ref={ref}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
      </CeorlShell>,
    )
    const shell = container.querySelector('.ceorl-shell') as HTMLElement
    shell.scrollTo = vi.fn()
    Object.defineProperty(shell, 'scrollLeft', { value: 400 })
    Object.defineProperty(shell, 'clientWidth', { value: 1000 })

    const cols = shell.querySelectorAll('.ceorl-column')
    Object.defineProperty(cols[0], 'offsetLeft', { value: 0 })
    Object.defineProperty(cols[1], 'offsetLeft', { value: 500 })
    Object.defineProperty(cols[1], 'offsetWidth', { value: 1200 })

    // col1: colRight=1700 > viewRight=1400，L=max(0,1700-1000)=700，R=500
    // |400-700|=300 > |400-500|=100 → R=500
    ref.current?.focusColumn(1)
    expect(shell.scrollTo).toHaveBeenCalledWith({ left: 500, behavior: 'smooth' })
  })

  it('focusColumn does not scroll when column is fully visible', () => {
    const ref = createRef<CeorlShellHandle>()
    const { container } = render(
      <CeorlShell ref={ref}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
      </CeorlShell>,
    )
    const shell = container.querySelector('.ceorl-shell') as HTMLElement
    shell.scrollTo = vi.fn()
    Object.defineProperty(shell, 'clientWidth', { value: 1000 })

    const cols = shell.querySelectorAll('.ceorl-column')
    Object.defineProperty(cols[0], 'offsetLeft', { value: 0 })
    Object.defineProperty(cols[0], 'offsetWidth', { value: 500 })

    ref.current?.focusColumn(0)
    expect(shell.scrollTo).not.toHaveBeenCalled()
  })

  it('onIndexChange is called once after scroll settle when focusColumn is invoked', () => {
    vi.useFakeTimers()
    const onIndexChange = vi.fn()
    const ref = createRef<CeorlShellHandle>()
    const { container } = render(
      <CeorlShell ref={ref} onIndexChange={onIndexChange}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
      </CeorlShell>,
    )
    const shell = container.querySelector('.ceorl-shell') as HTMLElement
    shell.scrollTo = vi.fn()
    const cols = container.querySelectorAll('.ceorl-column')
    Object.defineProperty(shell, 'clientWidth', { value: 1000 })
    Object.defineProperty(cols[1], 'offsetLeft', { value: 800 })
    Object.defineProperty(cols[1], 'offsetWidth', { value: 333, configurable: true })

    act(() => {
      ref.current?.focusColumn(1)
    })

    expect(onIndexChange).not.toHaveBeenCalled()

    Object.defineProperty(shell, 'scrollLeft', { value: 600, configurable: true })
    Object.defineProperty(cols[0], 'offsetWidth', { value: 500 })
    Object.defineProperty(cols[1], 'offsetWidth', { value: 500 })

    shell.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(300)

    expect(onIndexChange).toHaveBeenCalledTimes(1)
    expect(onIndexChange).toHaveBeenCalledWith(1)

    vi.useRealTimers()
  })

  it('user scroll triggers onIndexChange via settle', async () => {
    vi.useFakeTimers()
    const onIndexChange = vi.fn()
    const { container } = render(
      <CeorlShell onIndexChange={onIndexChange}>
        <CeorlColumn>A</CeorlColumn>
        <CeorlColumn>B</CeorlColumn>
      </CeorlShell>,
    )
    const shell = container.querySelector('.ceorl-shell') as HTMLElement

    // 模拟用户滚动到第 2 列
    Object.defineProperty(shell, 'scrollLeft', { value: 600, configurable: true })

    // 更新列宽度供 computeIndex 计算
    const cols = shell.querySelectorAll('.ceorl-column')
    Object.defineProperty(cols[0], 'offsetWidth', { value: 500 })
    Object.defineProperty(cols[1], 'offsetWidth', { value: 500 })

    shell.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(300)

    expect(onIndexChange).toHaveBeenCalledWith(1)

    vi.useRealTimers()
  })
})
