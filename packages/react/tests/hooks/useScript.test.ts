import { createElement } from 'react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// The renderer is used only to render without a window; its types are not installed here.
// @ts-expect-error -- react-test-renderer ships without declarations in this workspace
import TestRenderer from 'react-test-renderer'

import { useScript } from '@/hooks/useScript'

// Script elements created by the hook, with the listeners registered on each.
let createdScripts: any[] = []
let scriptListeners: Record<string, ((event: Event) => void)[]> = {}

const emitScriptEvent = (type: 'load' | 'error') => {
  for (const listener of scriptListeners[type] ?? []) {
    listener(new Event(type))
  }
}

describe('useScript', () => {
  beforeEach(() => {
    // Reset mocks before each test to ensure a clean environment
    vi.restoreAllMocks()

    // Fix timeout-related issues
    vi.useFakeTimers()

    createdScripts = []
    scriptListeners = {}

    // Spy on document.body.appendChild to avoid actual DOM manipulation
    vi.spyOn(document.body, 'appendChild').mockImplementation((element) => element)

    // Store the original document.createElement to call for non-script elements
    const originalCreateElement = document.createElement.bind(document)

    // Mock document.createElement to intercept script element creation
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'script') {
        // Mock script element
        const mockScriptElement = {
          ...originalCreateElement('script'),
          setAttribute: vi.fn(),
          addEventListener: vi.fn((event: string, callback: (event: Event) => void) => {
            scriptListeners[event] = scriptListeners[event] ?? []
            scriptListeners[event].push(callback)
            // Automatically trigger 'load' event after a delay to simulate script loading
            if (event === 'load') {
              setTimeout(() => callback(new Event('load')), 100)
            }
          }),
          removeEventListener: vi.fn(),
          remove: vi.fn(),
        }
        createdScripts.push(mockScriptElement)
        return mockScriptElement as unknown as HTMLScriptElement
      }
      // Use the original createElement for other elements
      return originalCreateElement(tagName)
    })
  })

  afterEach(() => {
    vi.useRealTimers()

    // Clean up and restore any global or module state changes
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should start in loading state and transition to ready when script loads successfully', async () => {
    const src = 'https://example.com/test-script.js'
    const { result, rerender } = renderHook(() => useScript(src))

    expect(result.current).toBe('loading')

    // Re-render the hook to ensure the state transition
    await act(async () => {
      // Wait for a short period to allow the script to load
      vi.advanceTimersByTime(200)

      rerender()
    })
    expect(result.current).toBe('ready')
  })

  it('returns "loading" state immediately in SSR context', async () => {
    const { result } = renderHook(() => useScript('https://example.com/script.js'))
    expect(result.current).toBe('loading') // Or 'idle' based on your hook logic
  })

  it('starts in "loading" when there is no window to load a script into', () => {
    // react-dom needs `window`, so the no-window render goes through the test renderer.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('window', undefined)

    let status: string | undefined
    const Probe = () => {
      status = useScript('https://example.com/ssr-script.js')
      return null
    }

    let renderer: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
      renderer = TestRenderer.create(createElement(Probe))
    })

    expect(status).toBe('loading')

    TestRenderer.act(() => {
      renderer.unmount()
    })

    consoleErrorSpy.mockRestore()
  })

  it('returns "idle" state when shouldPreventLoad is true', async () => {
    const { result } = renderHook(() =>
      useScript('https://example.com/script.js', { shouldPreventLoad: true })
    )
    expect(result.current).toBe('idle')
  })

  it('adopts a cached "ready" status without creating another script element', () => {
    const src = 'https://example.com/cached-ready.js'
    const first = renderHook(() => useScript(src))

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(first.result.current).toBe('ready')
    const createdCount = createdScripts.length

    const second = renderHook(() => useScript(src))

    expect(second.result.current).toBe('ready')
    expect(createdScripts).toHaveLength(createdCount)
  })

  it('adopts a cached "error" status without creating another script element', () => {
    const src = 'https://example.com/cached-error.js'
    const first = renderHook(() => useScript(src))

    act(() => {
      emitScriptEvent('error')
    })

    expect(first.result.current).toBe('error')
    const createdCount = createdScripts.length

    const second = renderHook(() => useScript(src))

    expect(second.result.current).toBe('error')
    expect(createdScripts).toHaveLength(createdCount)
  })

  it('applies the nonce to the script element', () => {
    renderHook(() => useScript('https://example.com/nonce-script.js', { nonce: 'abc123' }))

    expect(createdScripts.at(-1)?.nonce).toBe('abc123')
  })

  it('ignores a blank nonce', () => {
    renderHook(() => useScript('https://example.com/blank-nonce-script.js', { nonce: '   ' }))

    expect(createdScripts.at(-1)?.nonce).toBeUndefined()
  })

  it('adopts the status of a script element that is already in the document', () => {
    const existingNode = {
      getAttribute: vi.fn(() => 'error'),
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLScriptElement
    vi.spyOn(document, 'querySelector').mockReturnValue(existingNode)

    const { result } = renderHook(() => useScript('https://example.com/preexisting.js'))

    expect(result.current).toBe('error')
  })

  it('stays in "loading" for an existing element with no recorded status', () => {
    const existingNode = {
      getAttribute: vi.fn(() => null),
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLScriptElement
    vi.spyOn(document, 'querySelector').mockReturnValue(existingNode)

    const { result } = renderHook(() => useScript('https://example.com/preexisting-unloaded.js'))

    expect(result.current).toBe('loading')
  })

  it('removes the script element on unmount when removeOnUnmount is set', () => {
    const { unmount } = renderHook(() =>
      useScript('https://example.com/removable.js', { removeOnUnmount: true })
    )

    const scriptElement = createdScripts.at(-1)
    unmount()

    expect(scriptElement.remove).toHaveBeenCalled()
  })
})
