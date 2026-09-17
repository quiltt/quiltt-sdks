#!/usr/bin/env node

/**
 * check-version-drift.mjs
 *
 * Verifies the Changesets fixed versioning group still matches the packages that
 * exist, so no package can drift onto its own version line.
 *
 * Every package under `packages/` shares one version, and that is enforced by the
 * `fixed` group in `.changeset/config.json` — a hand-maintained list. Adding a
 * package without adding it to that list is the one way the packages can drift
 * apart, and it would only show up at release time. This check catches it in CI.
 *
 * Asserts:
 *   1. Every package under `packages/` is in a `fixed` group
 *   2. Every package resolves to the same `fixed` group
 *   3. No `fixed` entry names a package that no longer exists
 *   4. No package is both `fixed` and `ignore`d
 *   5. Every package that is not ignored is on the same version
 *
 * Usage:
 *   node scripts/check-version-drift.mjs
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_DIR = join(ROOT, 'packages')
const CONFIG_PATH = join(ROOT, '.changeset', 'config.json')

/**
 * Read every package manifest under `packages/`.
 *
 * A directory without a readable manifest is reported separately rather than
 * ignored, since that is exactly what a half-added package looks like.
 */
async function readPackages() {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true })
  const packages = []
  const manifestless = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const manifestPath = join(PACKAGES_DIR, entry.name, 'package.json')

    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))
      packages.push({ dir: entry.name, name: manifest.name, version: manifest.version })
    } catch {
      manifestless.push(entry.name)
    }
  }

  return { packages, manifestless }
}

/**
 * Flatten the `fixed` groups into a package name to group lookup.
 */
function groupIndex(fixedGroups) {
  const index = new Map()
  for (const group of fixedGroups) {
    for (const name of group) index.set(name, group)
  }
  return index
}

async function main() {
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'))
  const { packages, manifestless } = await readPackages()

  const fixedGroups = config.fixed ?? []
  const index = groupIndex(fixedGroups)
  const ignored = new Set(config.ignore ?? [])

  const errors = []

  // 1. Every package must be in a fixed group, or it versions on its own.
  const ungrouped = packages.filter((p) => !index.has(p.name))
  if (ungrouped.length > 0) {
    errors.push(
      ...ungrouped.map(
        (p) =>
          `${p.name} (packages/${p.dir}) is not in a \`fixed\` group, so it would version ` +
          `independently of the others`
      )
    )
  }

  // 2. Splitting the packages across groups would let the groups diverge.
  const groups = new Set(packages.filter((p) => index.has(p.name)).map((p) => index.get(p.name)))
  if (groups.size > 1) {
    errors.push(
      `the packages are split across ${groups.size} \`fixed\` groups; they must share one so a ` +
        `single release moves them together`
    )
  }

  // 3. A stale entry means the group no longer describes the repo.
  const knownNames = new Set(packages.map((p) => p.name))
  const stale = [...index.keys()].filter((name) => !knownNames.has(name))
  if (stale.length > 0) {
    errors.push(
      ...stale.map((name) => `${name} is in a \`fixed\` group but has no package under packages/`)
    )
  }

  // 4. A package cannot be both released in lock step and excluded.
  const bothFixedAndIgnored = [...ignored].filter((name) => index.has(name))
  if (bothFixedAndIgnored.length > 0) {
    errors.push(
      ...bothFixedAndIgnored.map(
        (name) =>
          `${name} is in both \`fixed\` and \`ignore\`; it cannot be both released and skipped`
      )
    )
  }

  // 5. Every released package must be on the same version.
  const released = packages.filter((p) => !ignored.has(p.name))
  const versions = [...new Set(released.map((p) => p.version))]
  if (versions.length > 1) {
    const byVersion = versions
      .map((version) => {
        const names = released.filter((p) => p.version === version).map((p) => p.name)
        return `      ${version}: ${names.join(', ')}`
      })
      .join('\n')

    errors.push(`the released packages are on ${versions.length} different versions:\n${byVersion}`)
  }

  for (const dir of manifestless) {
    console.log(`  note: packages/${dir} has no readable package.json, so it was skipped`)
  }

  console.log('')
  console.log(`  fixed group      : ${index.size} package(s)`)
  console.log(`  packages/        : ${released.length} released, ${ignored.size} ignored`)
  console.log(`  released version : ${versions.join(', ') || '(none)'}`)
  console.log('')

  if (errors.length > 0) {
    console.error('Version drift detected:\n')
    for (const error of errors) console.error(`  - ${error}`)
    console.error('')
    console.error('The packages must release in lock step. Add a new package to the `fixed`')
    console.error('group in .changeset/config.json, alongside the others.')
    console.error('')
    process.exitCode = 1
    return
  }

  console.log('No version drift: every package is in one fixed group and shares a version.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
