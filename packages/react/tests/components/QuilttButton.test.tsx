import type { MouseEvent } from 'react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'

import { QuilttButton } from '@/components'
import { useQuilttConnector } from '@/hooks/useQuilttConnector'

// Mock at module level with a default implementation
vi.mock('@/hooks/useQuilttConnector', () => ({
  useQuilttConnector: vi.fn(),
}))

describe('QuilttButton', () => {
  const mockOpen = vi.fn()

  beforeEach(() => {
    // Clear only the mock function calls, not the implementation
    mockOpen.mockClear()

    // Set implementation
    vi.mocked(useQuilttConnector).mockImplementation(() => ({
      open: mockOpen,
    }))
  })

  afterEach(() => {
    // Clean up after each test
    vi.mocked(useQuilttConnector).mockReset()
  })

  it('calls onClick and then opens the connector when clicked', () => {
    const onClick = vi.fn()

    const { getByRole } = render(
      <QuilttButton connectorId="mockConnectorId" onClick={onClick}>
        Test Button
      </QuilttButton>
    )

    const button = getByRole('button')
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalled()
    expect(mockOpen).toHaveBeenCalled()
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(mockOpen.mock.invocationCallOrder[0])
  })

  it('handles HTML load event separately from SDK load', () => {
    const onHtmlLoad = vi.fn()
    const { container } = render(
      <QuilttButton connectorId="mockConnectorId" onHtmlLoad={onHtmlLoad}>
        Test Button
      </QuilttButton>
    )

    const button = container.querySelector('button')
    expect(button).toBeTruthy()

    const loadEvent = new Event('load', {
      bubbles: true,
      cancelable: true,
    })

    if (button) {
      button.addEventListener('load', onHtmlLoad)
      button.dispatchEvent(loadEvent)
    }

    expect(onHtmlLoad).toHaveBeenCalledTimes(1)
    expect(onHtmlLoad).toHaveBeenCalledWith(expect.any(Event))
  })

  it('passes appLauncherUrl to useQuilttConnector', () => {
    render(
      <QuilttButton
        connectorId="mockConnectorId"
        appLauncherUrl="https://app.example.com/quiltt/callback"
      >
        Test Button
      </QuilttButton>
    )

    expect(useQuilttConnector).toHaveBeenCalledWith(
      'mockConnectorId',
      expect.objectContaining({ appLauncherUrl: 'https://app.example.com/quiltt/callback' })
    )
  })

  it('renders quiltt-app-launcher-url attribute on the button element', () => {
    const { container } = render(
      <QuilttButton
        connectorId="mockConnectorId"
        appLauncherUrl="https://app.example.com/quiltt/callback"
      >
        Test Button
      </QuilttButton>
    )

    const button = container.querySelector('button')
    expect(button?.getAttribute('quiltt-app-launcher-url')).toBe(
      'https://app.example.com/quiltt/callback'
    )
  })

  it('does not render quiltt-app-launcher-url attribute when not provided', () => {
    const { container } = render(
      <QuilttButton connectorId="mockConnectorId">Test Button</QuilttButton>
    )

    const button = container.querySelector('button')
    expect(button?.hasAttribute('quiltt-app-launcher-url')).toBe(false)
  })

  it('passes themeMode to useQuilttConnector', () => {
    render(
      <QuilttButton connectorId="mockConnectorId" themeMode="dark">
        Test Button
      </QuilttButton>
    )

    expect(useQuilttConnector).toHaveBeenCalledWith(
      'mockConnectorId',
      expect.objectContaining({ themeMode: 'dark' })
    )
  })

  it('renders quiltt-theme-mode attribute on the button element', () => {
    const { container } = render(
      <QuilttButton connectorId="mockConnectorId" themeMode="auto">
        Test Button
      </QuilttButton>
    )

    const button = container.querySelector('button')
    expect(button?.getAttribute('quiltt-theme-mode')).toBe('auto')
  })

  it('does not render quiltt-theme-mode attribute when not provided', () => {
    const { container } = render(
      <QuilttButton connectorId="mockConnectorId">Test Button</QuilttButton>
    )

    const button = container.querySelector('button')
    expect(button?.hasAttribute('quiltt-theme-mode')).toBe(false)
  })

  it('does not open the connector when onClick prevents the default action', () => {
    const onClick = vi.fn((event: MouseEvent<HTMLElement>) => {
      event.preventDefault()
    })

    const { getByRole } = render(
      <QuilttButton connectorId="mockConnectorId" onClick={onClick}>
        Test Button
      </QuilttButton>
    )

    fireEvent.click(getByRole('button'))

    expect(onClick).toHaveBeenCalled()
    expect(mockOpen).not.toHaveBeenCalled()
  })

  it('warns when callback references change after the initial render', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { rerender } = render(
      <QuilttButton connectorId="mockConnectorId" connectionId="conn-1" onExit={vi.fn()}>
        Test Button
      </QuilttButton>
    )

    rerender(
      <QuilttButton connectorId="mockConnectorId" connectionId="conn-1" onExit={vi.fn()}>
        Test Button
      </QuilttButton>
    )

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Callback functions changed after initial render')
    )

    consoleWarnSpy.mockRestore()
  })

  it('remounts the element when the connection changes with forceRemountOnConnectionChange', () => {
    const { container, rerender } = render(
      <QuilttButton
        connectorId="mockConnectorId"
        forceRemountOnConnectionChange
        connectionId="conn-1"
      >
        Test Button
      </QuilttButton>
    )

    const first = container.querySelector('button')

    rerender(
      <QuilttButton
        connectorId="mockConnectorId"
        forceRemountOnConnectionChange
        connectionId="conn-2"
      >
        Test Button
      </QuilttButton>
    )

    const second = container.querySelector('button')
    expect(second).not.toBe(first)
    expect(second?.getAttribute('quiltt-connection')).toBe('conn-2')
  })

  it('reuses the element when the connection changes without forceRemountOnConnectionChange', () => {
    const { container, rerender } = render(
      <QuilttButton connectorId="mockConnectorId" connectionId="conn-1">
        Test Button
      </QuilttButton>
    )

    const first = container.querySelector('button')

    rerender(
      <QuilttButton connectorId="mockConnectorId" connectionId="conn-2">
        Test Button
      </QuilttButton>
    )

    const second = container.querySelector('button')
    expect(second).toBe(first)
    expect(second?.getAttribute('quiltt-connection')).toBe('conn-2')
  })

  it('keys the element on the connector alone when no connection is set', () => {
    const { container, rerender } = render(
      <QuilttButton connectorId="mockConnectorId" forceRemountOnConnectionChange>
        Test Button
      </QuilttButton>
    )

    const first = container.querySelector('button')

    rerender(
      <QuilttButton connectorId="otherConnectorId" forceRemountOnConnectionChange>
        Test Button
      </QuilttButton>
    )

    expect(container.querySelector('button')).not.toBe(first)
  })
})
