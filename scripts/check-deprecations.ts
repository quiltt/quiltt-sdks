#!/usr/bin/env node

/**
 * check-deprecations.ts
 *
 * Scans .changeset/*.md files for major version bumps. If any are found,
 * scans the source tree for leftover @deprecated tags and deprecation
 * console warnings, then reports them and exits non-zero.
 *
 * Usage:
 *   node scripts/check-deprecations.ts
 */

import type { Dirent } from 'node:fs'
import { createReadStream } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHANGESET_DIR = join(ROOT, '.changeset')
const PACKAGES_DIR = join(ROOT, 'packages')

// ---------------------------------------------------------------------------
// Changeset parsing
// ---------------------------------------------------------------------------

type Bump = { package: string; bump: string }

/**
 * Parse the YAML frontmatter from a changeset .md file.
 * Returns an array of package bump entries: [{ package: string, bump: string }]
 */
async function parseChangesetFile(filePath: string): Promise<Bump[]> {
  const content = await readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  // Changeset frontmatter is between the first pair of --- markers
  if (lines[0]?.trim() !== '---') return []

  const frontmatterLines: string[] = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') break
    frontmatterLines.push(lines[i])
  }

  const entries: Bump[] = []
  for (const line of frontmatterLines) {
    // Format: "@quiltt/core": major   OR   "@quiltt/core": "major"
    const match = line.match(/^"(@quiltt\/[^"]+)":\s*"?(\w+)"?/)
    if (match) {
      entries.push({ package: match[1], bump: match[2] })
    }
  }

  return entries
}

/**
 * Return true if any changeset in .changeset/ declares a major bump.
 */
async function hasMajorBump(): Promise<boolean> {
  let files: string[]
  try {
    files = await readdir(CHANGESET_DIR)
  } catch {
    return false
  }

  const changesetFiles = files.filter((f) => f.endsWith('.md') && f !== 'README.md')

  for (const file of changesetFiles) {
    const entries = await parseChangesetFile(join(CHANGESET_DIR, file))
    if (entries.some((e) => e.bump === 'major')) {
      return true
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------

/**
 * Check if a line is inside a JSDoc block comment.
 * Very simple state-machine: track whether we're inside a block that
 * opens with slash-star-star and closes with star-slash.
 */
function isInsideJSDocBlock(lines: string[], lineIndex: number): boolean {
  let inBlock = false
  for (let i = 0; i <= lineIndex; i++) {
    const trimmed = lines[i].trim()
    if (inBlock) {
      if (trimmed.endsWith('*/')) inBlock = false
    } else if (trimmed.startsWith('/**')) {
      // Single-line JSDoc (/** ... */): open and close on the same line,
      // so don't enter block-tracking — avoids poisoning subsequent lines.
      if (!trimmed.endsWith('*/')) {
        inBlock = true
      }
    }
  }
  return inBlock || lines[lineIndex].trim().startsWith('/**')
}

type Finding = { line: number; content: string; type: 'jsdoc' | 'console-warn' }

/**
 * Scan a single file for deprecation indicators.
 * Returns an array of findings: [{ line, content }]
 */
async function scanSourceFile(filePath: string): Promise<Finding[]> {
  const findings: Finding[] = []

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  })

  const lines: string[] = []
  for await (const line of rl) {
    lines.push(line)
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()
    const lineNum = i + 1

    // 1) @deprecated inside a JSDoc comment
    if (trimmed.includes('@deprecated') && isInsideJSDocBlock(lines, i)) {
      findings.push({ line: lineNum, content: rawLine, type: 'jsdoc' })
      continue
    }

    // 2) console.warn with deprecation wording
    const lower = trimmed.toLowerCase()
    if (
      lower.includes('console.warn(') &&
      (lower.includes('deprecated') || lower.includes('deprecation'))
    ) {
      findings.push({ line: lineNum, content: rawLine, type: 'console-warn' })
    }
  }

  return findings
}

/**
 * Walk packages/ directories. Uses simple recursive descent,
 * skipping build artifact directories.
 */
async function* walkSourceFiles(dir: string): AsyncGenerator<string> {
  let entries: Dirent[] = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip node_modules, dist, .next, etc.
      if (['node_modules', 'dist', '.next', 'coverage', '__snapshots__'].includes(entry.name)) {
        continue
      }
      yield* walkSourceFiles(fullPath)
    } else if (/\.(ts|tsx|vue)$/.test(entry.name)) {
      yield fullPath
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type FindingWithFile = Finding & { file: string }

async function main(): Promise<void> {
  console.log(':: Check: Scanning .changeset/ for major version bumps...')
  const major = await hasMajorBump()

  if (!major) {
    console.log(':: No major bumps detected. Skipping deprecation audit.')
    process.exit(0)
  }

  console.log(':: Major bump detected! Auditing for leftover deprecations...\n')

  const allFindings: FindingWithFile[] = []

  for await (const filePath of walkSourceFiles(PACKAGES_DIR)) {
    const relativePath = filePath.replace(ROOT, '').replace(/^\//, '')
    const findings = await scanSourceFile(filePath)
    for (const f of findings) {
      allFindings.push({ file: relativePath, ...f })
    }
  }

  if (allFindings.length === 0) {
    console.log(':: No leftover deprecations found. Clean major bump!')
    process.exit(0)
  }

  // Report findings
  console.log(
    `:: Found ${allFindings.length} deprecation(s) that must be resolved before a major release:\n`
  )

  for (const { file, line, content, type } of allFindings) {
    const tag = type === 'jsdoc' ? '@deprecated' : 'console.warn'
    console.log(`  ${file}:${line}  [${tag}]`)
    console.log(`    ${content.trim()}`)
    console.log()
  }

  console.log(':: Remove all deprecated code before cutting a major version.')
  console.log(
    ':: If a deprecation must remain, remove it from this major changeset and defer to a future major.'
  )

  process.exit(1)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
