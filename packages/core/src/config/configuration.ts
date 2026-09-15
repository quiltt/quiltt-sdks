import { name as PACKAGE_NAME, version as PACKAGE_VERSION } from '../../package.json'

const QUILTT_API_INSECURE = (() => {
  try {
    return process.env.QUILTT_API_INSECURE === 'true'
  } catch {
    return false
  }
})()

const QUILTT_API_DOMAIN = (() => {
  try {
    return process.env.QUILTT_API_DOMAIN
  } catch {
    return undefined
  }
})()

const QUILTT_DEBUG = (() => {
  try {
    return process.env.NODE_ENV !== 'production' && process.env.QUILTT_DEBUG === 'true'
  } catch {
    return false
  }
})()

const domain = QUILTT_API_DOMAIN || 'quiltt.io'
const protocolHttp = `http${QUILTT_API_INSECURE ? '' : 's'}`
const protocolWebsockets = `ws${QUILTT_API_INSECURE ? '' : 's'}`

const QUILTT_INTERNAL_HOST_SEPARATOR = (() => {
  try {
    return process.env.QUILTT_INTERNAL_HOST_SEPARATOR
  } catch {
    return undefined
  }
})()

const hostSeparator = QUILTT_INTERNAL_HOST_SEPARATOR || '.'

export const debugging = QUILTT_DEBUG
export const version = `${PACKAGE_NAME}: v${PACKAGE_VERSION}`

export const cdnBase = `${protocolHttp}://cdn${hostSeparator}${domain}`
export const endpointAuth = `${protocolHttp}://auth${hostSeparator}${domain}/v1/users/session`
export const endpointGraphQL = `${protocolHttp}://api${hostSeparator}${domain}/v1/graphql`
export const endpointRest = `${protocolHttp}://api${hostSeparator}${domain}/v1`
export const endpointWebsockets = `${protocolWebsockets}://api${hostSeparator}${domain}/websockets`
