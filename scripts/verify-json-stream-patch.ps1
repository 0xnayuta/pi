$ErrorActionPreference = "Stop"

Write-Host "[1/3] Installing dependencies (workspace root)..."
npm.cmd install

Write-Host "[2/3] Building @earendil-works/pi-tui (required by coding-agent tests)..."
npm.cmd --prefix packages/tui run build

Write-Host "[3/3] Running compact JSON stream patch regression tests..."
Push-Location packages/coding-agent
try {
  npm.cmd exec -- vitest --run `
    test/args.test.ts `
    test/json-event-filter.test.ts `
    test/print-mode.test.ts
} finally {
  Pop-Location
}

Write-Host "Done: json stream patch verification passed."
