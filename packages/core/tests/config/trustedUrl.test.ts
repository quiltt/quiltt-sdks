import { describe, expect, it } from 'vitest'

import { isTrustedQuilttUrl } from '@/config'

const QUILTT_HOST = 'quiltt.io'
const OTHER_HOST = 'evil.com'

/**
 * Stands in for a wildcard DNS domain. `.test` is reserved for fixtures, so the
 * suite never names a real one.
 */
const LOCAL_DOMAIN = 'wildcard.test'

// Built from code points so the cases below stay readable and cannot be mangled
// by escaping when read or edited.
const BACKSLASH = String.fromCharCode(92)
const TAB = String.fromCharCode(9)
const LINE_FEED = String.fromCharCode(10)
const CARRIAGE_RETURN = String.fromCharCode(13)
const NUL = String.fromCharCode(0)

/**
 * Builds a URL with a userinfo segment, which is what a request ignores when
 * deciding where to connect. Assembled from parts so the cases below state which
 * half is the userinfo and which is the host.
 */
const withUserinfo = (userinfo: string, host: string) => `https://${userinfo}@${host}`

describe('isTrustedQuilttUrl', () => {
  describe('Quiltt hosts over TLS', () => {
    it.each([
      'https://quiltt.io',
      'https://quiltt.dev',
      'https://quiltt.app',
      'https://api.quiltt.io',
      'https://auth.quiltt.io',
      'https://cdn.quiltt.io',
      'wss://api.quiltt.io',
      'wss://api.quiltt.io/websockets',
      // Any depth of subdomain is accepted.
      'https://a.b.quiltt.dev',
      // A trailing path or query is irrelevant to the check.
      'https://api.quiltt.io/v1/graphql?foo=bar',
      // An explicit default port is the same origin.
      'https://api.quiltt.io:443',
      // Scheme and host are matched case-insensitively.
      'HTTPS://API.QUILTT.IO',
      // Userinfo does not change where the request lands.
      withUserinfo('token', QUILTT_HOST),
      withUserinfo('token:secret', `api.${QUILTT_HOST}`),
    ])('accepts %s', (url) => {
      expect(isTrustedQuilttUrl(url)).toBe(true)
    })
  })

  describe('Quiltt hosts that must be refused', () => {
    it.each([
      // A downgrade is refused even when the host is right.
      ['http://api.quiltt.io', 'plain HTTP'],
      ['ws://api.quiltt.io', 'plain websockets'],
      // A Quiltt domain appearing anywhere in the host is not enough.
      ['https://api.quiltt.io.example.com', 'Quiltt as a leading label'],
      ['https://quiltt.io.example.com', 'Quiltt as a leading label'],
      ['https://notquiltt.io', 'Quiltt as a suffix without a boundary'],
      ['https://evilquiltt.io', 'Quiltt as a suffix without a boundary'],
      // Only the ports a Quiltt service listens on.
      ['https://api.quiltt.io:8443', 'a non-default port'],
      ['https://api.quiltt.io:3000', 'a non-default port'],
      // Userinfo that merely looks like Quiltt: the request still goes to the
      // host after the `@`.
      [withUserinfo(QUILTT_HOST, OTHER_HOST), 'a spoofed userinfo'],
      [withUserinfo(`api.${QUILTT_HOST}`, OTHER_HOST), 'a spoofed userinfo'],
      // Other schemes.
      ['ftp://api.quiltt.io', 'a scheme the SDK does not use'],
      ['file:///etc/passwd', 'a scheme the SDK does not use'],
      ['javascript:alert(1)', 'a scheme the SDK does not use'],
      // Unparseable.
      ['api.quiltt.io', 'no scheme'],
      ['', 'nothing at all'],
      ['   ', 'nothing at all'],
    ])('refuses %s because of %s', (url) => {
      expect(isTrustedQuilttUrl(url)).toBe(false)
    })
  })

  // The URL parser reads these differently than a naive split does, which would
  // otherwise let the allowlist pass a value that resolves somewhere else. A
  // backslash is the dangerous one: it ends the authority, so the Quiltt host
  // that follows the `@` is a path to the browser, and anything appended to the
  // URL — a session token included — goes to the host before the backslash.
  describe('inputs the URL parser would read differently', () => {
    it.each([
      // A browser resolves this host to evil.com; the check must not accept it.
      [`https://${OTHER_HOST}${BACKSLASH}@.quiltt.app`, 'a backslash ending the authority early'],
      [`https://${OTHER_HOST}${BACKSLASH}@${QUILTT_HOST}`, 'a backslash hiding the real host'],
      // These would otherwise be accepted, since the visible host is Quiltt.
      [`https://api.quiltt.io${BACKSLASH}@${OTHER_HOST}`, 'a backslash before a foreign host'],
      [`https://${OTHER_HOST}${TAB}@.quiltt.app`, 'a tab the parser strips'],
      [`https://${OTHER_HOST}${LINE_FEED}@.quiltt.app`, 'a line feed the parser strips'],
      [
        `https://${OTHER_HOST}${CARRIAGE_RETURN}@.quiltt.app`,
        'a carriage return the parser strips',
      ],
      [`https://${OTHER_HOST}${NUL}@.quiltt.app`, 'a null byte'],
      // A percent escape the parser rejects outright, so accepting it would
      // hand callers a URL that cannot be navigated to.
      [`https://${OTHER_HOST}%2f.${QUILTT_HOST}`, 'a percent-encoded delimiter in the host'],
      [`https://${OTHER_HOST}%00.${QUILTT_HOST}`, 'a percent-encoded null in the host'],
    ])('refuses %s because of %s', (url) => {
      expect(isTrustedQuilttUrl(url)).toBe(false)
    })

    it('still accepts the value when nothing is hidden in it', () => {
      // The guard must not reject ordinary URLs; it only refuses the characters
      // above, which no service URL contains.
      expect(isTrustedQuilttUrl(withUserinfo('token', QUILTT_HOST))).toBe(true)
      expect(isTrustedQuilttUrl('https://api.quiltt.io/v1/graphql?foo=bar&baz=1')).toBe(true)
      // A percent escape is only refused in the host, so an encoded path or
      // query is unaffected.
      expect(isTrustedQuilttUrl('https://api.quiltt.io/v1/graphql?q=a%20b')).toBe(true)
      expect(isTrustedQuilttUrl('https://api.quiltt.io/v1/connectors/a%2Fb.css')).toBe(true)
    })
  })

  describe('local development hosts', () => {
    describe('loopback', () => {
      it.each([
        'http://localhost',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://[::1]:3000',
        'ws://localhost:3000',
        // TLS is not required locally, but it is still allowed.
        'https://localhost:3000',
      ])('accepts %s when local hosts are allowed', (url) => {
        expect(isTrustedQuilttUrl(url, { allowLocalHosts: true })).toBe(true)
      })

      it.each([
        ['http://localhost.example.com', 'localhost as a leading label'],
        ['http://example.com', 'an unrelated host'],
      ])('refuses %s even when local hosts are allowed, because of %s', (url) => {
        expect(isTrustedQuilttUrl(url, { allowLocalHosts: true })).toBe(false)
      })
    })

    describe('a domain supplied in localHostDomains', () => {
      const options = { localHostDomains: [LOCAL_DOMAIN] }

      it.each([
        `http://${LOCAL_DOMAIN}:3000`,
        `http://api.${LOCAL_DOMAIN}:3000`,
        `ws://api.${LOCAL_DOMAIN}:3000`,
        `https://api.${LOCAL_DOMAIN}:3000`,
      ])('accepts %s', (url) => {
        expect(isTrustedQuilttUrl(url, options)).toBe(true)
      })

      it.each([
        [`http://not${LOCAL_DOMAIN}:3000`, 'the domain as a suffix without a boundary'],
        [`http://${LOCAL_DOMAIN}.example.com`, 'the domain as a leading label'],
      ])('refuses %s, because of %s', (url) => {
        expect(isTrustedQuilttUrl(url, options)).toBe(false)
      })

      it('does not accept an unrelated local domain', () => {
        expect(isTrustedQuilttUrl('http://api.other.test:3000', options)).toBe(false)
      })
    })

    it.each(['http://localhost:3000', `http://api.${LOCAL_DOMAIN}:3000`])(
      'refuses %s by default, so a caller checking a message origin cannot widen its trust',
      (url) => {
        expect(isTrustedQuilttUrl(url)).toBe(false)
      }
    )
  })
})
