# BAKE REPORT — MMJ-05P-G-R2-R2

## Direct Node Predeploy Gate Runner / Recursive npm Invocation Removal Seal

### Incident

The deployment command was already running inside an npm lifecycle process. The PowerShell deployment script recursively invoked `npm run gate:mmj-05p-g-r2`, and the client Windows environment resolved that nested invocation as the invalid npm command `pm`. The gate suite did not start.

### Repair

- Replaced the PowerShell nested npm invocation with a direct Node runner.
- Added `scripts/mmj-05p-g-r2-run-predeploy-gate.mjs` as the gate-order SSOT.
- Changed `package.json` `gate:mmj-05p-g-r2` to the same Node runner.
- Preserved each child process stdout, stderr, exit status, and failing script identity.
- Added static regression checks forbidding recursive npm invocation in the deployment script.

### Invariants

- New Apps Script projects: 0
- Apps Script manual function executions: 0
- Existing bound Script ID: preserved
- Recursive npm calls during deployment: 0
- Gate steps: direct `process.execPath` child processes only
