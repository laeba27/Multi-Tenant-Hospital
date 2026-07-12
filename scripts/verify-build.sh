#!/usr/bin/env bash
#
# Type-check / compile the app WITHOUT touching .next.
#
# A plain `next build` writes to .next -- which corrupts a running dev server's
# cache and leaves it serving 500s (routes-manifest.json goes missing). That has
# bitten this project three times. Always verify through this script.
#
# It builds into a scratch directory and removes it afterwards, so a dev server
# on :3000 keeps running untouched.
#
set -euo pipefail
cd "$(dirname "$0")/.."

SCRATCH=".next-verify-$$"
cleanup() { rm -rf "$SCRATCH" next.config.mjs.verify-bak 2>/dev/null || true; }
trap cleanup EXIT

cp next.config.mjs next.config.mjs.verify-bak
node -e '
  const fs = require("fs");
  let c = fs.readFileSync("next.config.mjs", "utf8");
  if (!c.includes("distDir")) {
    c = c.replace(/const nextConfig\s*=\s*\{/, `const nextConfig = {\n  distDir: process.env.BUILD_DIR || ".next",`);
    fs.writeFileSync("next.config.mjs", c);
  }
'

set +e
BUILD_DIR="$SCRATCH" npx next build --no-lint 2>&1 \
  | grep -iE "⨯|error|Failed to compile|✓ Compiled|✓ Generating"
STATUS=${PIPESTATUS[0]}
set -e

mv next.config.mjs.verify-bak next.config.mjs

if [ "$STATUS" -eq 0 ]; then
  echo "✓ compiles clean — dev server untouched"
else
  echo "✗ build failed (exit $STATUS)"
fi
exit "$STATUS"
