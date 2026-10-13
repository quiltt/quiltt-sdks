#!/usr/bin/env node

/**
 * check-published-versions.ts
 *
 * Decides whether there is anything left to publish, so a re-run of the release
 * pipeline is a no-op instead of a failure.
 *
 * `pnpm -r publish` does not skip versions that are already on the registry — it
 * sends the request and the registry rejects it with `409 Conflict`
 * ("Cannot publish over previously staged version"). That made the release
 * workflow fail whenever it ran twice for the same version, which happens on
 * every release: changesets/action pushes the tags and the version commit back
 * to `main`, and `release-js.yml` is triggered by pushes to `main`, so it runs
 * a second time against the exact versions it just published.
 *
 * `check-version-drift` guarantees every package shares one version, so the
 * registry state is decided by probing any single package: if that version is
 * live, no package needs publishing. If it is absent, publishing proceeds as
 * before.
 *
 * Exit codes:
 *   0 — nothing to publish, and the version is genuinely live
 *   1 — (with GITHUB_OUTPUT set) there is something to publish
 *   1 — (with GITHUB_OUTPUT unset) the check could not run
 *
 * Usage:
 *   node scripts/check-published-versions.ts                 # local / debugging
 *   GITHUB_OUTPUT=$GITHUB_OUTPUT node scripts/check-published-versions.ts
 */

import { appendFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_DIR = join(ROOT, 'packages')
const CONFIG_PATH = join(ROOT, '.changeset', 'config.json')
const REGISTRY = 'https://registry.npmjs.org'

const ATTEMPTS = 3
const TIMEOUT_MS = 10_000

interface PackageInfo {
  dir: string
  name: string
  version: string
  private: boolean
}

interface ChangesetConfig {
  ignore?: string[]
}

/** Read every package manifest under `packages/`. */
async function readPackages(): Promise<PackageInfo[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true })
  const packages: PackageInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    try {
      const raw = await readFile(join(PACKAGES_DIR, entry.name, 'package.json'), 'utf8')
      const manifest = JSON.parse(raw) as {
        name?: string
        version?: string
        private?: boolean
      }
      if (manifest.name && manifest.version) {
        packages.push({
          dir: entry.name,
          name: manifest.name,
          version: manifest.version,
          // The native SDKs (android/flutter/ios) set `private: true` and are
          // released to Maven Central / pub.dev / SPM, never to npm.
          private: manifest.private === true,
        })
      }
    } catch {
      // Not a package directory — nothing to do.
    }
  }

  return packages
}

async function readConfig(): Promise<ChangesetConfig> {
  try {
    return JSON.parse(await readFile(CONFIG_PATH, 'utf8')) as ChangesetConfig
  } catch {
    return {}
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** GET a registry URL, returning the HTTP status (or null on a transport error). */
async function statusOf(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // npm asks automated clients to identify themselves. The version
        // endpoint only answers `application/json` — the abbreviated packument
        // media type returns 406.
        'user-agent': 'quiltt-sdks-release-check/1.0',
        accept: 'application/json',
        authorization: `Bearer ${process.env.NODE_AUTH_TOKEN ?? process.env.GITHUB_TOKEN ?? ''}`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    })
    return response.status
  } catch {
    return null
  }
}

/**
 * True when `name@version` is already on the registry.
 *
 * Throws when the registry cannot be reached, so a network problem can never be
 * mistaken for "please publish this".
 */
async function versionExists(name: string, version: string): Promise<boolean> {
  const url = `${REGISTRY}/${name.replace('/', '%2F')}/${version}`

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const status = await statusOf(url)

    if (status === 200) return true
    if (status === 404) return false
    if (status === 429 || (status !== null && status >= 500)) {
      // Rate limited or a transient registry error — back off and retry.
      await sleep(500 * 2 ** (attempt - 1))
      continue
    }

    throw new Error(
      `Unexpected HTTP ${status ?? 'transport error'} probing ${name}@${version} (${url})`
    )
  }

  throw new Error(`Registry did not answer after ${ATTEMPTS} attempts for ${name}@${version}`)
}

/** Announce progress on stdout so the release log explains the decision. */
function report(value: string): void {
  console.log(value)
}

function setGithubOutput(key: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT
  if (!outputPath) return
  // Append the `key=value` form the workflow runner parses.
  appendFileSync(outputPath, `${key}=${value}\n`)
}

async function main(): Promise<number> {
  const [packages, config] = await Promise.all([readPackages(), readConfig()])
  const ignored = new Set(config.ignore ?? [])
  // Private packages are not on npm at all, so they must never be probed.
  const candidates = packages
    .filter((pkg) => !pkg.private && !ignored.has(pkg.name))
    // Sort for a stable, reproducible probe target across machines.
    .sort((a, b) => a.name.localeCompare(b.name))

  if (candidates.length === 0) {
    console.error('No publishable packages found under packages/')
    return 1
  }

  const versions = new Set(candidates.map((pkg) => pkg.version))
  if (versions.size !== 1) {
    console.error(
      `Expected every package on one version (see check-version-drift), found: ${[...versions].join(', ')}`
    )
    return 1
  }

  const probe = candidates[0]
  const version = probe.version
  const exists = await versionExists(probe.name, version)
  report(`Checking ${probe.name}@${version}: ${exists ? 'published' : 'not found'}`)

  if (exists) {
    report(`All packages are already at ${version} on npm — nothing to publish.`)
    setGithubOutput('published', 'true')
    return 0
  }

  report(`${probe.name}@${version} is not on npm yet — proceeding with publish.`)
  setGithubOutput('published', 'false')
  return process.env.GITHUB_OUTPUT ? 1 : 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
