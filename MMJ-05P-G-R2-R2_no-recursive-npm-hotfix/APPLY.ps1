param(
  [string]$RepoRoot = "D:\11124\ma\MMJ-sync"
)

$ErrorActionPreference = "Stop"
$PatchRoot = Split-Path $MyInvocation.MyCommand.Path -Parent

$files = @(
  "package.json",
  "scripts\deploy-mmj-05p-g-r2-existing-bound.ps1",
  "scripts\mmj-05p-g-r2-run-predeploy-gate.mjs",
  "scripts\mmj-05p-g-r2-existing-bound-owner-webapp-gate.mjs",
  "BAKE_REPORT_MMJ_05P_G_R2_R2_DIRECT_NODE_PREDEPLOY_GATE_RUNNER.md",
  "MMJ_05P_G_R2_R2_TEST_LOG.txt",
  "MMJ_05P_G_R2_R2_CHANGED_FILES_SHA256.txt"
)

foreach ($relative in $files) {
  $source = Join-Path $PatchRoot $relative
  $target = Join-Path $RepoRoot $relative
  $targetDirectory = Split-Path $target -Parent
  New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
  Copy-Item $source $target -Force
  Write-Host "PATCHED $relative"
}

Set-Location $RepoRoot
& node "scripts/mmj-05p-g-r2-run-predeploy-gate.mjs"
if ($LASTEXITCODE -ne 0) {
  throw "MMJ-05P-G-R2-R2 direct Node gate failed."
}

Write-Host "PASS_MMJ_05P_G_R2_R2_HOTFIX_APPLIED"
