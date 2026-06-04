import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CeorlStack } from './Stack'

describe('CeorlStack', () => {
  it('renders with .ceorl-stack class', () => {
    const { container } = render(<CeorlStack>Content</CeorlStack>)
    expect(container.firstChild).toHaveClass('ceorl-stack')
  })

  it('renders children', () => {
    render(
      <CeorlStack>
        <div data-testid="child-a">A</div>
        <div data-testid="child-b">B</div>
      </CeorlStack>,
    )
    expect(screen.getByTestId('child-a')).toBeInTheDocument()
    expect(screen.getByTestId('child-b')).toBeInTheDocument()
  })
})
