/**
 * Host allowlist for the URLs the SDK is told to talk to.
 *
 * These values reach the SDK through build-time configuration, so the check
 * below is a guardrail rather than a security boundary: it cannot stop anyone
 * who controls the build. What it does catch is a base URL that points somewhere
 * unintended — a mistake in an environment's configuration, or a change made by
 * someone who can edit a deploy variable but not the code.
 */

/**
 * Domains the SDK talks to over TLS. A Quiltt service is always a subdomain of
 * one of these, at whatever depth the environment uses.
 */
const QUILTT_HOST_DOMAINS = ['quiltt.io', 'quiltt.dev', 'quiltt.app']

/** Hosts that only ever refer to the machine the code is running on. */
const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '::1']

/** A Quiltt host is only ever reachable over TLS. */
const TRUSTED_SCHEMES = ['https', 'wss']

/** A local service is served in the clear, and websockets follow with `ws`. */
const LOCAL_SCHEMES = ['http', 'https', 'ws', 'wss']

type ParsedOrigin = {
  scheme: string
  host: string
  port: string | undefined
}

const matchesDomain = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`)

/**
 * A URL handed to the SDK is printable ASCII, with no backslash. Anything else
 * is refused before matching, because the URL parser reinterprets or drops those
 * characters, so a value can be read one way here and another way when it is
 * navigated to.
 *
 * A backslash is the dangerous one. For the schemes used here it ends the
 * authority, so `https://evil.example\@.quiltt.app` splits as host
 * `.quiltt.app` — which this allowlist accepts — while a browser resolves the
 * host to `evil.example` and reads the rest as a path. Anything built from that
 * value, session token included, then goes to `evil.example`. Tab, line feed and
 * carriage return hide the same difference, since the parser strips them
 * wherever they appear.
 *
 * The ranges are printable ASCII with `\x5c` (backslash) carved out.
 */
const ALLOWED_URL_CHARACTERS = /^[\x21-\x5b\x5d-\x7e]+$/

/**
 * Characters a URL parser refuses to find in a host, plus the percent sign.
 *
 * Rejecting exactly what a parser rejects is what keeps this aligned with it: a
 * host the browser will not accept must not be accepted here, or callers are
 * handed a URL they cannot navigate to. `%` is included because a percent escape
 * in a host is not something a parser resolves, and it is host-scoped rather
 * than global so a percent-encoded path or query still works.
 *
 * Control characters and spaces are already refused for the whole value, so only
 * the printable code points appear here.
 *
 * @see https://url.spec.whatwg.org/#forbidden-host-code-point
 */
const FORBIDDEN_HOST_CHARACTERS = /[#%/:<>?@[\]^|\\]/

/**
 * Splits an absolute URL into the parts the allowlist cares about.
 *
 * Hand-rolled rather than using `new URL()`, which this module cannot rely on:
 * it is loaded by the React Native and Capacitor packages, where the global
 * `URL` polyfill does not implement `hostname` dependably. Anything unparseable
 * yields `undefined`, which callers treat as untrusted.
 *
 * @note The checks here exist to keep this in step with a real URL parser. When
 *   it disagrees with the browser, the allowlist stops meaning what it says.
 */
const parseOrigin = (value: string): ParsedOrigin | undefined => {
  const candidate = value.trim()
  if (!ALLOWED_URL_CHARACTERS.test(candidate)) return undefined

  const match = candidate.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]+)/i)
  if (!match) return undefined

  const scheme = match[1].toLowerCase()

  // Drop userinfo before matching, since it does not affect where a request
  // lands: whatever follows the last `@` is the host actually reached, so a
  // userinfo segment that merely looks like a Quiltt host must not be trusted.
  const authority = match[2].slice(match[2].lastIndexOf('@') + 1)
  if (!authority) return undefined

  // A bracketed IPv6 host keeps its colons inside the brackets.
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']')
    if (end === -1) return undefined

    return {
      scheme,
      host: authority.slice(1, end).toLowerCase(),
      port: authority.slice(end + 1).replace(/^:/, '') || undefined,
    }
  }

  const [rawHost, port] = authority.split(':')
  if (!rawHost) return undefined

  const host = rawHost.toLowerCase()
  if (FORBIDDEN_HOST_CHARACTERS.test(host)) return undefined

  return { scheme, host, port: port || undefined }
}

export type TrustedUrlOptions = {
  /**
   * Accept loopback hosts — `localhost`, `127.0.0.1`, `::1` — over a plain
   * connection, so the SDK can reach a service running on the local machine.
   *
   * Off by default. A caller checking where a message came *from* should not
   * widen its trust to whatever happens to be listening locally.
   */
  allowLocalHosts?: boolean

  /**
   * Extra domains to treat as local, each matching itself and any subdomain.
   *
   * Supply this for a wildcard DNS service that resolves subdomains to the
   * loopback interface, which is one way to run a service-per-subdomain setup
   * on a developer's machine. The SDK names no such domain itself, so a setup
   * that needs one keeps it in its own configuration.
   */
  localHostDomains?: string[]
}

/**
 * True when `value` is an absolute URL the SDK is willing to talk to.
 *
 * A Quiltt host must be served over TLS, so a downgrade to `http://` is refused
 * even when the host is correct. A host that is neither Quiltt nor an allowed
 * local host is refused outright, which keeps a misconfigured or tampered base
 * URL from pointing the SDK somewhere else.
 *
 * @example isTrustedQuilttUrl('https://api.quiltt.io')           // true
 * @example isTrustedQuilttUrl('https://a.b.quiltt.dev')          // true
 * @example isTrustedQuilttUrl('wss://api.quiltt.io')             // true
 * @example isTrustedQuilttUrl('http://api.quiltt.io')            // false
 * @example isTrustedQuilttUrl('https://api.quiltt.io.evil.com')  // false
 * @example isTrustedQuilttUrl('https://api.quiltt.io:8443')      // false
 * @example isTrustedQuilttUrl('http://localhost:3000')           // false
 * @example isTrustedQuilttUrl('http://localhost:3000', { allowLocalHosts: true }) // true
 */
export const isTrustedQuilttUrl = (value: string, options: TrustedUrlOptions = {}): boolean => {
  const origin = parseOrigin(value)
  if (!origin) return false

  if (QUILTT_HOST_DOMAINS.some((domain) => matchesDomain(origin.host, domain))) {
    // Only the ports a Quiltt service actually listens on: an explicit
    // `https://api.quiltt.io:8443` names something the SDK does not know.
    const defaultPort = origin.port === undefined || origin.port === '443'

    return defaultPort && TRUSTED_SCHEMES.includes(origin.scheme)
  }

  const isLoopback = !!options.allowLocalHosts && LOOPBACK_HOSTNAMES.includes(origin.host)
  const isLocalDomain = (options.localHostDomains ?? []).some((domain) =>
    matchesDomain(origin.host, domain)
  )

  return (isLoopback || isLocalDomain) && LOCAL_SCHEMES.includes(origin.scheme)
}
