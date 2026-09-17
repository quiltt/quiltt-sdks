import { name as PACKAGE_NAME, version as PACKAGE_VERSION } from '../../package.json'
import { isTrustedQuilttUrl } from './trustedUrl'

// Every lookup below is spelled out rather than factored into a helper: bundlers
// only substitute `process.env.X` when it appears as a static member expression,
// so a dynamic `process.env[key]` would read as `undefined` in a browser bundle.
// The try/catch keeps this module loadable where `process.env` does not exist at
// all (React Native, some Capacitor runtimes).

const QUILTT_DEBUG = (() => {
  try {
    return process.env.NODE_ENV !== 'production' && process.env.QUILTT_DEBUG === 'true'
  } catch {
    return false
  }
})()

// Every service is addressed by a complete origin. Nothing is composed from a
// domain, so the SDK carries no knowledge of any environment's host layout: an
// environment names the hosts it serves, in whatever shape, and the allowlist in
// `trustedUrl` keeps them inside Quiltt.
//
// A value is an origin only — the SDK still appends the paths it owns, so
// `QUILTT_API_BASE_URL=https://api.quiltt.io` yields
// `https://api.quiltt.io/v1/graphql`. Unset means production, and a host that is
// neither Quiltt nor local is fatal; see `trustedBaseUrl`.
const QUILTT_API_BASE_URL = (() => {
  try {
    return process.env.QUILTT_API_BASE_URL
  } catch {
    return undefined
  }
})()

const QUILTT_AUTH_BASE_URL = (() => {
  try {
    return process.env.QUILTT_AUTH_BASE_URL
  } catch {
    return undefined
  }
})()

const QUILTT_CDN_BASE_URL = (() => {
  try {
    return process.env.QUILTT_CDN_BASE_URL
  } catch {
    return undefined
  }
})()

// Websockets ride the API service, so this only matters when they terminate
// somewhere else.
const QUILTT_WEBSOCKETS_BASE_URL = (() => {
  try {
    return process.env.QUILTT_WEBSOCKETS_BASE_URL
  } catch {
    return undefined
  }
})()

// Domains to treat as local, so a developer's machine can serve a service per
// subdomain off a wildcard DNS name. Comma-separated. The SDK names no such
// domain itself, so the choice of one stays in the configuration that uses it.
const QUILTT_LOCAL_HOST_DOMAINS = (() => {
  try {
    return process.env.QUILTT_LOCAL_HOST_DOMAINS
  } catch {
    return undefined
  }
})()

const localHostDomains = (QUILTT_LOCAL_HOST_DOMAINS ?? '')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean)

/**
 * Resolves a base URL override, falling back to production when it is unset.
 *
 * A blank value counts as unset, and a trailing slash is dropped so an appended
 * path cannot double up — Heroku and wrangler both surface a config var that was
 * never set as an empty string.
 *
 * An untrusted host is fatal rather than ignored. Falling back to production
 * would keep the app running, but for an environment that *meant* to point
 * somewhere else it would quietly send that traffic to production instead.
 */
const trustedBaseUrl = (variable: string, value: string | undefined, fallback: string): string => {
  const override = value?.trim().replace(/\/+$/, '') || undefined

  if (!override) return fallback

  if (!isTrustedQuilttUrl(override, { allowLocalHosts: true, localHostDomains })) {
    throw new Error(
      `${variable} must be a Quiltt host (quiltt.io, quiltt.dev or quiltt.app), or a local ` +
        `host: localhost, or a domain listed in QUILTT_LOCAL_HOST_DOMAINS. Received: ` +
        `"${override}". Unset it to use ${fallback}.`
    )
  }

  return override
}

const apiBaseUrl = trustedBaseUrl(
  'QUILTT_API_BASE_URL',
  QUILTT_API_BASE_URL,
  'https://api.quiltt.io'
)
const authBaseUrl = trustedBaseUrl(
  'QUILTT_AUTH_BASE_URL',
  QUILTT_AUTH_BASE_URL,
  'https://auth.quiltt.io'
)
const cdnBaseUrl = trustedBaseUrl(
  'QUILTT_CDN_BASE_URL',
  QUILTT_CDN_BASE_URL,
  'https://cdn.quiltt.io'
)

// A websocket URL is an HTTP URL wearing a different scheme, so the API origin
// supplies it — already validated above — unless websockets are told to
// terminate somewhere else.
const websocketsBaseUrl = trustedBaseUrl(
  'QUILTT_WEBSOCKETS_BASE_URL',
  QUILTT_WEBSOCKETS_BASE_URL,
  `${apiBaseUrl.startsWith('https') ? 'wss' : 'ws'}://${apiBaseUrl.replace(/^https?:\/\//, '')}`
)

export const debugging = QUILTT_DEBUG
export const version = `${PACKAGE_NAME}: v${PACKAGE_VERSION}`

// Origins, for consumers that build their own URLs against the same services.
export const apiBase = apiBaseUrl
export const authBase = authBaseUrl
export const cdnBase = cdnBaseUrl
export const websocketsBase = websocketsBaseUrl

export const endpointAuth = `${authBaseUrl}/v1/users/session`
export const endpointGraphQL = `${apiBaseUrl}/v1/graphql`
export const endpointRest = `${apiBaseUrl}/v1`
export const endpointWebsockets = `${websocketsBaseUrl}/websockets`
