import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const read = (file: string): string => readFileSync(join(root, file), 'utf8')

const errors: string[] = []
const check = (name: string, actual: string | undefined, expected: string | undefined): void => {
  if (actual !== expected) {
    errors.push(`${name}: expected "${expected}", got "${actual}"`)
  }
}

// nvm/rbenv files may carry a leading "v" (e.g. "v24.14.0"); mise does not.
const norm = (version?: string): string => version?.replace(/^v/, '') ?? ''

// Parse `tool version` lines from .tool-versions, skipping comments and blanks.
const tools: Record<string, string> = {}
for (const line of read('.tool-versions').split('\n')) {
  const trimmed = line.trim()
  if (trimmed === '' || trimmed.startsWith('#')) continue
  const [name, version] = trimmed.split(/\s+/)
  if (name && version) tools[name] = version
}

// Node: .tool-versions must match .nvmrc (read by CI's setup-js).
check('node', norm(tools.node), norm(read('.nvmrc').trim()))

// Ruby: .tool-versions must match .ruby-version.
check('ruby', norm(tools.ruby), norm(read('.ruby-version').trim()))

// pnpm: .tool-versions must match package.json#packageManager.
const { packageManager } = JSON.parse(read('package.json')) as { packageManager: string }
check('pnpm', norm(tools.pnpm), norm(packageManager.replace(/^pnpm@/, '')))

// Flutter: .tool-versions must match the setup-flutter action default and the
// "current stable" entry in ci-flutter.yml — the version releases are built with.
const setupFlutter = read('.github/actions/setup-flutter/action.yml')
const setupDefault = setupFlutter.match(/default:\s*'?([\d.]+)'?/)?.[1]
check('flutter (setup-flutter default)', norm(tools.flutter), norm(setupDefault))

const ciFlutter = read('.github/workflows/ci-flutter.yml')
const ciStable = ciFlutter.match(/flutter-version:\s*\["([\d.]+)"/)?.[1]
check('flutter (ci-flutter current stable)', norm(tools.flutter), norm(ciStable))

// Java: .tool-versions must pin the canonical major version 21.
if (!/-21$/.test(tools.java ?? '')) {
  errors.push(`java: expected a "...-21" pin (e.g. temurin-21), got "${tools.java}"`)
}

if (errors.length > 0) {
  console.error(
    'Tool version drift detected — update .tool-versions and re-run `pnpm check:tool-versions`.'
  )
  for (const message of errors) console.error(`  - ${message}`)
  process.exit(1)
}

console.log('Tool versions are consistent.')
