import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollSettle } from './useScrollSettle'
import type React from 'react'

function createMockContainer() {
  const div = document.createElement('div')
  vi.spyOn(div, 'addEventListener')
  vi.spyOn(div, 'removeEventListener')
  return div
}

describe('useScrollSettle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers scroll listener on mount', () => {
    const container = createMockContainer()
    const ref = { current: container }

    renderHook(() => useScrollSettle(ref))

    expect(container.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true },
    )
  })

  it('registers scrollend listener when supported', () => {
    const container = document.createElement('div')
    vi.spyOn(container, 'addEventListener')
    const ref = { current: container }

    renderHook(() => useScrollSettle(ref))

    expect(container.addEventListener).toHaveBeenCalledWith(
      'scrollend',
      expect.any(Function),
    )
  })

  it('cleans up listeners on unmount', () => {
    const container = createMockContainer()
    const ref = { current: container }

    const { unmount } = renderHook(() => useScrollSettle(ref))
    unmount()

    expect(container.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    )
  })

  it('calls onScrollSettle with index and seq on scroll settle', async () => {
    vi.useFakeTimers()
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollTo', { value: vi.fn() })
    const col1 = document.createElement('div')
    col1.className = 'ceorl-column'
    Object.defineProperty(col1, 'offsetWidth', { value: 500 })
    const col2 = document.createElement('div')
    col2.className = 'ceorl-column'
    Object.defineProperty(col2, 'offsetWidth', { value: 500 })
    container.appendChild(col1)
    container.appendChild(col2)

    const ref = { current: container } as React.RefObject<HTMLDivElement>
    const onScrollSettle = vi.fn()

    renderHook(() => useScrollSettle(ref, { onScrollSettle }))

    Object.defineProperty(container, 'scrollLeft', { value: 550, configurable: true })

    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(300)

    expect(onScrollSettle).toHaveBeenCalledWith(1, expect.any(Number))

    vi.useRealTimers()
  })

  it('provides seq number in onScrollSettle callback', async () => {
    vi.useFakeTimers()
    const container = document.createElement('div')
    const ref = { current: container } as React.RefObject<HTMLDivElement>
    const onScrollSettle = vi.fn()

    renderHook(() => useScrollSettle(ref, { onScrollSettle }))

    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(300)

    expect(onScrollSettle.mock.calls[0][1]).toBeGreaterThan(0)

    vi.useRealTimers()
  })

  it('does nothing when container ref is null', () => {
    const ref = { current: null }
    expect(() => renderHook(() => useScrollSettle(ref))).not.toThrow()
  })

  it('handles container with no columns gracefully', () => {
    const container = createMockContainer()
    const ref = { current: container }
    expect(() => renderHook(() => useScrollSettle(ref))).not.toThrow()
  })

  it('scrollend clears debounce timer and fires settle exactly once', () => {
    vi.useFakeTimers()
    const container = document.createElement('div')
    const onScrollSettle = vi.fn()
    const ref = { current: container } as React.RefObject<HTMLDivElement>

    renderHook(() => useScrollSettle(ref, { onScrollSettle }))

    container.dispatchEvent(new Event('scroll'))
    container.dispatchEvent(new Event('scrollend'))

    expect(onScrollSettle).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(300)
    expect(onScrollSettle).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
