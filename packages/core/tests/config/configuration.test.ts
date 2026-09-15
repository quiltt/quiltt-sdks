import { beforeEach, describe, expect, it, vi } from 'vitest'

import { name as packageName, version as packageVersion } from '../../package.json'

// Save the original environment variables
const originalEnv = process.env

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

  it('should use secure protocols with quiltt.io by default', async () => {
    const config = await loadConfig({})

    expect(config.cdnBase).toMatch('https://cdn.quiltt.io')
    expect(config.endpointAuth).toMatch('https://auth.quiltt.io/v1/users/session')
    expect(config.endpointGraphQL).toMatch('https://api.quiltt.io/v1/graphql')
    expect(config.endpointWebsockets).toMatch('wss://api.quiltt.io/websockets')
  })

  // Ensure that packages work on React Native and other platforms with no process.env support
  describe('when process.env is not available', () => {
    beforeEach(async () => {
      // @ts-expect-error
      delete process.env
    })

    it('should use secure protocols with quiltt.io', async () => {
      const config = await loadConfig({})

      expect(config.cdnBase).toBe('https://cdn.quiltt.io')
      expect(config.endpointAuth).toBe('https://auth.quiltt.io/v1/users/session')
      expect(config.endpointGraphQL).toBe('https://api.quiltt.io/v1/graphql')
      expect(config.endpointWebsockets).toBe('wss://api.quiltt.io/websockets')
    })
  })

  describe('API Domain', () => {
    describe.each([
      [undefined, 'quiltt.io'],
      ['quiltt.io', 'quiltt.io'],
      ['lvh.me:3000', 'lvh.me:3000'],
    ])('when QUILTT_API_DOMAIN is %s', (quilttApiDomain, expectedDomain) => {
      it(`should use ${expectedDomain}`, async () => {
        const config = await loadConfig({ QUILTT_API_DOMAIN: quilttApiDomain })

        expect(config.cdnBase).toMatch(new RegExp(`://cdn.${expectedDomain}$`))
        expect(config.endpointAuth).toMatch(
          new RegExp(`://auth.${expectedDomain}/v1/users/session$`)
        )
        expect(config.endpointGraphQL).toMatch(new RegExp(`://api.${expectedDomain}/v1/graphql$`))
        expect(config.endpointWebsockets).toMatch(
          new RegExp(`://api.${expectedDomain}/websockets$`)
        )
      })
    })
  })

  describe('Private host layout override', () => {
    it('keeps the public `{service}.{domain}` layout when unset', async () => {
      const config = await loadConfig({ QUILTT_API_DOMAIN: 'pr-11574.r.quiltt.dev' })

      expect(config.cdnBase).toBe('https://cdn.pr-11574.r.quiltt.dev')
      expect(config.endpointGraphQL).toBe('https://api.pr-11574.r.quiltt.dev/v1/graphql')
    })

    it('composes service hosts with the override separator', async () => {
      const config = await loadConfig({
        QUILTT_API_DOMAIN: 'pr-11574.r.quiltt.dev',
        QUILTT_INTERNAL_HOST_SEPARATOR: '-',
      })

      expect(config.cdnBase).toBe('https://cdn-pr-11574.r.quiltt.dev')
      expect(config.endpointAuth).toBe('https://auth-pr-11574.r.quiltt.dev/v1/users/session')
      expect(config.endpointGraphQL).toBe('https://api-pr-11574.r.quiltt.dev/v1/graphql')
      expect(config.endpointRest).toBe('https://api-pr-11574.r.quiltt.dev/v1')
      expect(config.endpointWebsockets).toBe('wss://api-pr-11574.r.quiltt.dev/websockets')
    })
  })

  describe('Protocols', () => {
    describe.each([
      ['true', 'http', 'ws'],
      ['false', 'https', 'wss'],
      [undefined, 'https', 'wss'],
    ])('Configuration when QUILTT_API_INSECURE is %s', (insecure, httpProtocol, wsProtocol) => {
      let config: any

      beforeEach(async () => {
        config = await loadConfig({ QUILTT_API_INSECURE: insecure })
      })

      it(`should use ${httpProtocol.toUpperCase()} for CDN and endpoints`, () => {
        expect(config.cdnBase).toMatch(new RegExp(`^${httpProtocol}://`))
        expect(config.endpointAuth).toMatch(new RegExp(`^${httpProtocol}://`))
        expect(config.endpointGraphQL).toMatch(new RegExp(`^${httpProtocol}://`))
      })

      it(`should use ${wsProtocol.toUpperCase()} for Websockets`, () => {
        expect(config.endpointWebsockets).toMatch(new RegExp(`^${wsProtocol}://`))
      })
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
