#!/usr/bin/env node
/**
 * Verification build that cannot disturb a running dev server.
 *
 * `next dev` and `next build` share the .next directory and write
 * incompatible artifacts to it, so building while the dev server is up leaves
 * it serving chunks that no longer exist -- which shows up as an Internal
 * Server Error until .next is deleted. This builds into .next-check instead.
 *
 * Next also rewrites tsconfig.json's `include` to point at whatever distDir it
 * just built, and it does so before the type check, so no config option
 * prevents it. We snapshot just that file and restore it afterwards, rather
 * than `git checkout`, which would throw away unrelated uncommitted edits.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'

const TSCONFIG = 'tsconfig.json'
const DIST = '.next-check'

const before = readFileSync(TSCONFIG, 'utf8')
let failed = false

try {
  execFileSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, NEXT_DIST_DIR: DIST },
  })
} catch {
  failed = true
} finally {
  if (readFileSync(TSCONFIG, 'utf8') !== before) writeFileSync(TSCONFIG, before)
  rmSync(DIST, { recursive: true, force: true })
}

process.exit(failed ? 1 : 0)
