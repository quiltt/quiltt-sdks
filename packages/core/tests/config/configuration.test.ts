import { beforeEach, describe, expect, it, vi } from 'vitest'

import { name as packageName, version as packageVersion } from '../../package.json'

// Save the original environment variables
const originalEnv = process.env

/**
 * Stands in for a wildcard DNS domain. `.test` is reserved for fixtures, so the
 * suite never names a real one.
 */
const LOCAL_DOMAIN = 'wildcard.test'

// Function to load the configuration with cache busting
const loadConfig = async (envConfig: Record<string, string | undefined>) => {
  // Reset modules to clear the cache
  vi.resetModules()

  // Set environment variables
  for (const key of Object.keys(envConfig)) {
    process.env[key] = envConfig[key]
  }

  // Dynamic import the configuration module
  return import('@/config')
}

// Reset the environment variables before each test
beforeEach(() => {
  process.env = { ...originalEnv }
  vi.resetModules()
})

describe('Configuration Constants', () => {
  it('should format the version correctly', async () => {
    const config = await loadConfig({})
    expect(config.version).toBe(`${packageName}: v${packageVersion}`)
  })

  it('should use the production origins by default', async () => {
    const config = await loadConfig({})

    expect(config.apiBase).toBe('https://api.quiltt.io')
    expect(config.authBase).toBe('https://auth.quiltt.io')
    expect(config.cdnBase).toBe('https://cdn.quiltt.io')
    expect(config.websocketsBase).toBe('wss://api.quiltt.io')
    expect(config.endpointAuth).toBe('https://auth.quiltt.io/v1/users/session')
    expect(config.endpointGraphQL).toBe('https://api.quiltt.io/v1/graphql')
    expect(config.endpointRest).toBe('https://api.quiltt.io/v1')
    expect(config.endpointWebsockets).toBe('wss://api.quiltt.io/websockets')
  })

  // Ensure that packages work on React Native and other platforms with no process.env support
  describe('when process.env is not available', () => {
    beforeEach(async () => {
      // @ts-expect-error
      delete process.env
    })

    it('should use the production origins', async () => {
      const config = await loadConfig({})

      expect(config.apiBase).toBe('https://api.quiltt.io')
      expect(config.authBase).toBe('https://auth.quiltt.io')
      expect(config.cdnBase).toBe('https://cdn.quiltt.io')
      expect(config.endpointAuth).toBe('https://auth.quiltt.io/v1/users/session')
      expect(config.endpointGraphQL).toBe('https://api.quiltt.io/v1/graphql')
      expect(config.endpointWebsockets).toBe('wss://api.quiltt.io/websockets')
    })
  })

  describe('Base URL overrides', () => {
    // Placeholder hosts: the SDK accepts any Quiltt subdomain, at any depth.
    const API = 'https://a.quiltt.io'
    const AUTH = 'https://b.quiltt.io'
    const CDN = 'https://c.quiltt.io'

    it('overrides each service origin independently', async () => {
      const config = await loadConfig({
        QUILTT_API_BASE_URL: API,
        QUILTT_AUTH_BASE_URL: AUTH,
        QUILTT_CDN_BASE_URL: CDN,
      })

      expect(config.apiBase).toBe(API)
      expect(config.authBase).toBe(AUTH)
      expect(config.cdnBase).toBe(CDN)
      expect(config.endpointAuth).toBe(`${AUTH}/v1/users/session`)
      expect(config.endpointGraphQL).toBe(`${API}/v1/graphql`)
      expect(config.endpointRest).toBe(`${API}/v1`)
      expect(config.endpointWebsockets).toBe('wss://a.quiltt.io/websockets')
    })

    it('overrides only the services that are set, keeping production for the rest', async () => {
      const config = await loadConfig({ QUILTT_AUTH_BASE_URL: AUTH })

      expect(config.authBase).toBe(AUTH)
      expect(config.apiBase).toBe('https://api.quiltt.io')
      expect(config.cdnBase).toBe('https://cdn.quiltt.io')
    })

    it('maps the API origin onto the websocket scheme', async () => {
      const config = await loadConfig({ QUILTT_API_BASE_URL: 'http://localhost:3000' })

      expect(config.apiBase).toBe('http://localhost:3000')
      expect(config.endpointWebsockets).toBe('ws://localhost:3000/websockets')
    })

    it('lets the websockets override diverge from the API host', async () => {
      const config = await loadConfig({
        QUILTT_API_BASE_URL: API,
        QUILTT_WEBSOCKETS_BASE_URL: 'wss://d.quiltt.io',
      })

      expect(config.websocketsBase).toBe('wss://d.quiltt.io')
      expect(config.endpointWebsockets).toBe('wss://d.quiltt.io/websockets')
    })

    it('drops a trailing slash so appended paths do not double up', async () => {
      const config = await loadConfig({ QUILTT_API_BASE_URL: `${API}/` })

      expect(config.endpointRest).toBe(`${API}/v1`)
    })

    it('treats a blank value as unset', async () => {
      const config = await loadConfig({
        QUILTT_API_BASE_URL: '',
        QUILTT_AUTH_BASE_URL: '   ',
      })

      expect(config.apiBase).toBe('https://api.quiltt.io')
      expect(config.authBase).toBe('https://auth.quiltt.io')
    })
  })

  describe('Untrusted base URLs', () => {
    it.each([
      ['QUILTT_API_BASE_URL', 'https://api.example.com'],
      // A downgrade is refused even though the host is right.
      ['QUILTT_API_BASE_URL', 'http://api.quiltt.io'],
      ['QUILTT_AUTH_BASE_URL', 'https://auth.quiltt.io.example.com'],
      // A Quiltt service only listens on the default port.
      ['QUILTT_CDN_BASE_URL', 'https://cdn.quiltt.io:8443'],
      ['QUILTT_WEBSOCKETS_BASE_URL', 'wss://sockets.example.com'],
    ])('refuses to load when %s is %s', async (variable, value) => {
      await expect(loadConfig({ [variable]: value })).rejects.toThrow(variable)
    })

    it('names the variable, the value, and the fallback it would have used', async () => {
      await expect(
        loadConfig({ QUILTT_AUTH_BASE_URL: 'https://auth.example.com' })
      ).rejects.toThrow(/QUILTT_AUTH_BASE_URL must be a Quiltt host.*Unset it to use/)
    })

    it('accepts loopback hosts', async () => {
      const config = await loadConfig({
        QUILTT_API_BASE_URL: 'http://localhost:3000',
        QUILTT_AUTH_BASE_URL: 'http://127.0.0.1:3000',
      })

      expect(config.apiBase).toBe('http://localhost:3000')
      expect(config.authBase).toBe('http://127.0.0.1:3000')
    })

    it('accepts a domain listed in QUILTT_LOCAL_HOST_DOMAINS', async () => {
      const config = await loadConfig({
        QUILTT_LOCAL_HOST_DOMAINS: `${LOCAL_DOMAIN}, other.test`,
        QUILTT_API_BASE_URL: `http://api.${LOCAL_DOMAIN}:3000`,
        QUILTT_AUTH_BASE_URL: 'http://auth.other.test:3000',
      })

      expect(config.apiBase).toBe(`http://api.${LOCAL_DOMAIN}:3000`)
      expect(config.authBase).toBe('http://auth.other.test:3000')
    })

    it('refuses a local domain that is not listed', async () => {
      await expect(
        loadConfig({ QUILTT_API_BASE_URL: `http://api.${LOCAL_DOMAIN}:3000` })
      ).rejects.toThrow('QUILTT_API_BASE_URL')
    })
  })

  describe('Debugging', () => {
    describe.each([
      ['production', 'true', false],
      ['production', 'false', false],
      ['production', undefined, false],
      ['development', 'true', true],
      ['development', 'false', false],
      ['development', undefined, false],
    ])('when NODE_ENV is %s and QUILTT_DEBUG is %s', (nodeEnv, quilttDebug, expectedDebugging) => {
      it(`should be ${expectedDebugging ? 'enabled' : 'disabled'}`, async () => {
        const config = await loadConfig({ NODE_ENV: nodeEnv, QUILTT_DEBUG: quilttDebug })

        expect(config.debugging).toBe(expectedDebugging)
      })
    })
  })
})
