import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react-native'

import { ErrorScreen } from '@/components/ErrorScreen'

describe('ErrorScreen', () => {
  const errorText = 'You are offline'
  const mockCta = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly with provided error message', () => {
    const { getByText, getByTestId } = render(
      <ErrorScreen testId="error-screen" error={errorText} cta={mockCta} />
    )

    expect(getByTestId('error-screen')).toBeTruthy()

    // Check that the main text and error message are rendered
    expect(getByText('Cannot connect to the internet.')).toBeTruthy()
    expect(getByText(errorText)).toBeTruthy()

    // Check that the pressable (button) is rendered
    const button = getByText('Exit')
    expect(button).toBeTruthy()

    // Simulate a press on the button and check if the function is called
    fireEvent.press(button)
    expect(mockCta).toHaveBeenCalled()
  })

  it('should render a custom title and CTA label', () => {
    const { getByText } = render(
      <ErrorScreen
        testId="error-screen"
        title="Unable to load the Connector."
        error={errorText}
        ctaLabel="Try again"
        cta={mockCta}
      />
    )

    expect(getByText('Unable to load the Connector.')).toBeTruthy()
    fireEvent.press(getByText('Try again'))
    expect(mockCta).toHaveBeenCalled()
  })
})
