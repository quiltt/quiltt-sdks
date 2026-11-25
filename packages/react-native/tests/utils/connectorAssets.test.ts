import { afterEach, describe, expect, it, vi } from 'vitest'

import { extractConnectorAssetUrls, probeConnectorAssets } from '@/utils/connectorAssets'

const DOCUMENT_URL = 'https://example.quiltt.app/?mode=webview&agent=react-native'

const documentWith = (head: string) =>
  `<!doctype html><html><head>${head}</head><body></body></html>`

describe('extractConnectorAssetUrls', () => {
  it('extracts the module entry and its preload dependencies in order', () => {
    const html = documentWith(`
      <link rel="modulepreload" href="https://cdn.quiltt.io/vite/assets/components-CAvRjkX1.js">
      <script type="module" src="https://cdn.quiltt.io/vite/connector/application.js"></script>
      <link rel="preload" as="script" href="https://cdn.quiltt.io/vite/assets/ScreenInspector-DWVe7A-M.js">
    `)

    expect(extractConnectorAssetUrls(html, DOCUMENT_URL)).toEqual([
      'https://cdn.quiltt.io/vite/assets/components-CAvRjkX1.js',
      'https://cdn.quiltt.io/vite/connector/application.js',
      'https://cdn.quiltt.io/vite/assets/ScreenInspector-DWVe7A-M.js',
    ])
  })

  it('resolves relative assets against the document URL and deduplicates them', () => {
    const html = documentWith(`
      <link rel="modulepreload" href="/vite/assets/entry.js">
      <link rel="modulepreload" href="https://example.quiltt.app/vite/assets/entry.js">
      <script type="module" src="/vite/connector/application.js"></script>
    `)

    expect(extractConnectorAssetUrls(html, DOCUMENT_URL)).toEqual([
      'https://example.quiltt.app/vite/assets/entry.js',
      'https://example.quiltt.app/vite/connector/application.js',
    ])
  })

  it('ignores non-module scripts, non-script preloads, and third-party URLs', () => {
    const html = documentWith(`
      <link rel="stylesheet" href="https://cdn.quiltt.io/vite/assets/index.css">
      <link rel="icon" href="https://cdn.quiltt.io/favicon.ico">
      <link rel="preload" as="font" href="https://cdn.quiltt.io/fonts/inter.woff2">
      <link rel="preload" as="script" href="https://evil.example.com/analytics.js">
      <script src="https://cdn.quiltt.io/legacy.js"></script>
      <script type="module" src="http://cdn.quiltt.io/insecure.js"></script>
      <script type="module" src="https://cdn.quiltt.io/vite/connector/application.js"></script>
    `)

    expect(extractConnectorAssetUrls(html, DOCUMENT_URL)).toEqual([
      'https://cdn.quiltt.io/vite/connector/application.js',
    ])
  })

  it('caps the probe at twelve assets', () => {
    const links = Array.from(
      { length: 20 },
      (_, index) =>
        `<link rel="modulepreload" href="https://cdn.quiltt.io/vite/assets/chunk-${index}.js">`
    ).join('')

    expect(extractConnectorAssetUrls(documentWith(links), DOCUMENT_URL)).toHaveLength(12)
  })

  it('returns an empty list when the document declares no module graph', () => {
    expect(
      extractConnectorAssetUrls(documentWith('<title>Connector</title>'), DOCUMENT_URL)
    ).toEqual([])
  })
})

describe('probeConnectorAssets', () => {
  const assets = [
    'https://cdn.quiltt.io/vite/connector/application.js',
    'https://cdn.quiltt.io/vite/assets/components-CAvRjkX1.js',
  ]

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockStatuses = (
    statuses: Record<string, number | (() => number)>,
    calls: Array<{ url: string; method: string }>
  ) => {
    vi.spyOn(global, 'fetch').mockImplementation((input: any, init?: any) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })

      const status = statuses[url]
      const resolved = typeof status === 'function' ? status() : (status ?? 200)
      return Promise.resolve(new Response(null, { status: resolved }))
    })
  }

  it('passes when every declared asset responds successfully', async () => {
    const calls: Array<{ url: string; method: string }> = []
    mockStatuses({}, calls)

    await expect(probeConnectorAssets(assets)).resolves.toBeNull()
    expect(calls).toHaveLength(2)
    expect(calls.every((call) => call.method === 'HEAD')).toBe(true)
  })

  it('reports a missing asset with its URL and status', async () => {
    const calls: Array<{ url: string; method: string }> = []
    mockStatuses({ [assets[1]]: 404 }, calls)

    await expect(probeConnectorAssets(assets)).resolves.toEqual({
      url: assets[1],
      statusCode: 404,
    })
  })

  it('does not retry a deterministic 404', async () => {
    const calls: Array<{ url: string; method: string }> = []
    mockStatuses({ [assets[0]]: 404 }, calls)

    await probeConnectorAssets([assets[0]])
    expect(calls).toHaveLength(1)
  })

  it('falls back to a ranged GET when the CDN rejects HEAD', async () => {
    const calls: Array<{ url: string; method: string }> = []
    mockStatuses({ [assets[0]]: 405 }, calls)

    await expect(probeConnectorAssets([assets[0]])).resolves.toBeNull()
    expect(calls.map((call) => call.method)).toEqual(['HEAD', 'GET'])
  })

  it('leaves an asset unverified when both HEAD and the ranged GET are blocked', async () => {
    const calls: Array<{ url: string; method: string }> = []
    mockStatuses({ [assets[0]]: 403 }, calls)

    await expect(probeConnectorAssets([assets[0]])).resolves.toBeNull()
    expect(calls.map((call) => call.method)).toEqual(['HEAD', 'GET'])
  })

  it('retries a transient 5xx once', async () => {
    let attempts = 0
    const calls: Array<{ url: string; method: string }> = []
    mockStatuses(
      {
        [assets[0]]: () => {
          attempts += 1
          return attempts === 1 ? 503 : 200
        },
      },
      calls
    )

    await expect(probeConnectorAssets([assets[0]])).resolves.toBeNull()
    expect(attempts).toBe(2)
  })

  it('reports an asset that keeps failing after the retry', async () => {
    const calls: Array<{ url: string; method: string }> = []
    mockStatuses({ [assets[0]]: 503 }, calls)

    await expect(probeConnectorAssets([assets[0]])).resolves.toEqual({
      url: assets[0],
      statusCode: 503,
    })
  })
})
