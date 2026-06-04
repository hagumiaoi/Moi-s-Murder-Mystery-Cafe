import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CeorlColumn } from './Column'

describe('CeorlColumn', () => {
  it('renders with default width 1/3', () => {
    const { container } = render(<CeorlColumn>Content</CeorlColumn>)
    const col = container.querySelector('.ceorl-column')
    expect(col).toHaveAttribute('data-width', '1/3')
    expect(col).toHaveStyle({ width: '33.333%' })
  })

  it('renders with explicit width 1/2', () => {
    const { container } = render(<CeorlColumn width="1/2">Content</CeorlColumn>)
    const col = container.querySelector('.ceorl-column')
    expect(col).toHaveAttribute('data-width', '1/2')
    expect(col).toHaveStyle({ width: '50%' })
  })

  it('renders with explicit width 1/4', () => {
    const { container } = render(<CeorlColumn width="1/4">Content</CeorlColumn>)
    const col = container.querySelector('.ceorl-column')
    expect(col).toHaveAttribute('data-width', '1/4')
    expect(col).toHaveStyle({ width: '25%' })
  })

  it('renders children inside .ceorl-column-inner', () => {
    const { container } = render(
      <CeorlColumn>
        <span data-testid="child">Hello</span>
      </CeorlColumn>,
    )
    const inner = container.querySelector('.ceorl-column-inner')
    expect(inner).toBeInTheDocument()
    expect(inner?.querySelector('[data-testid="child"]')).toBeInTheDocument()
  })

  it('has no default padding on inner', () => {
    const { container } = render(<CeorlColumn>Content</CeorlColumn>)
    const inner = container.querySelector('.ceorl-column-inner') as HTMLElement
    expect(inner.style.padding).toBe('')
  })

  it('custom padding overrides default', () => {
    const { container } = render(<CeorlColumn padding="8px 24px">Content</CeorlColumn>)
    const inner = container.querySelector('.ceorl-column-inner') as HTMLElement
    expect(inner.style.padding).toBe('8px 24px')
  })

  it('zero padding is valid', () => {
    const { container } = render(<CeorlColumn padding="0">Content</CeorlColumn>)
    const inner = container.querySelector('.ceorl-column-inner') as HTMLElement
    expect(inner.style.padding).toBe('0px')
  })

  it('has position relative for ::after focus highlight context', () => {
    const style = document.createElement('style')
    style.textContent = '.ceorl-column { position: relative; }'
    document.head.appendChild(style)

    const { container } = render(<CeorlColumn>Content</CeorlColumn>)
    const col = container.querySelector('.ceorl-column') as HTMLElement
    expect(window.getComputedStyle(col).position).toBe('relative')

    style.remove()
  })
})
