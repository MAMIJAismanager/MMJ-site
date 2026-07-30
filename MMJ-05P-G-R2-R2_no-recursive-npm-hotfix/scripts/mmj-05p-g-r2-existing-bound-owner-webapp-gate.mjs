import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const sealed = process.argv.includes('--sealed')
const root = 'apps-script/media-cms'
const read = name => readFileSync(join(root, name), 'utf8')
const productionGs = readdirSync(root).filter(name => name.endsWith('.gs'))
const allGs = productionGs.map(read).join('\n')
const manifest = JSON.parse(read('appsscript.json'))
const clasp = JSON.parse(read('.clasp.json'))
const binding = read('MMJRuntimeBinding05PGR2.generated.gs')
const launchSeal = read('MMJRuntimeLaunchSeal05PGR2.generated.gs')
const boundBridge = read('BoundOwnerWebAppBridge05PGR2.gs')
const webapp = read('OwnerWebApp05PGR2.gs')
const authoring = read('ProductionAuthoring05JR1.gs')
const browserBridge = read('ProductionAuthoringBridge05JR1.js.html')
const menu = read('Menu.gs')
const schema = read('SheetSchema.gs')
const deploy = readFileSync('scripts/deploy-mmj-05p-g-r2-existing-bound.ps1', 'utf8')
const gateRunner = readFileSync('scripts/mmj-05p-g-r2-run-predeploy-gate.mjs', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const resolver = readFileSync('scripts/mmj-05p-g-r2-resolve-bound-parent.mjs', 'utf8')
const privateSurfaceMap = JSON.parse(readFileSync('MMJ_05P_G_R2_PRIVATE_SERVER_SURFACE_MAP.json', 'utf8'))

assert.equal(clasp.scriptId, '1VTSM5Kx7iIO0hKVHbgqGQXl_E3Ylw67r6uvRI7evw70tBr15Z2au50Dl', 'existing bound Script ID drifted')
assert.equal(clasp.rootDir, '.')
const retiredG1Paths = [
  'apps-script/media-cms-bound-retirement',
  join(root, 'AssetCleanupUi05L.gs.bound-legacy.txt'),
  join(root, 'LEGACY_BOUND_SCRIPT.clasp.json'),
  join(root, 'Menu.bound-legacy.txt'),
  join(root, 'Migration05IUi.gs.bound-legacy.txt'),
  join(root, 'PostRevisionUi05K.gs.bound-legacy.txt'),
  join(root, 'PublicationHistoryUi05M.gs.bound-legacy.txt'),
  join(root, 'SETUP_STANDALONE.md'),
  join(root, 'SelectedWorkSidebarController05J.gs.bound-legacy.txt'),
  join(root, 'StandaloneCmsWebApp05PGR1.gs'),
  join(root, 'StandaloneWorkbookRuntime05PGR1.gs'),
  join(root, 'deploy-standalone.ps1'),
  'scripts/mmj-05p-f-r1-retired-by-05p-g-r1.mjs',
  'scripts/mmj-05p-g-r1-standalone-owner-runtime-gate.mjs',
  'scripts/mmj-05p-g-r1-standalone-owner-runtime.test.mjs',
]
for (const retiredPath of retiredG1Paths) {
  assert(!existsSync(retiredPath), `G-R1 residue must be migrated before deployment: ${retiredPath}`)
}

assert.equal(manifest.webapp?.executeAs, 'USER_DEPLOYING')
assert.equal(manifest.webapp?.access, 'ANYONE')
assert(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.container.ui'))
assert(manifest.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets'))
assert.match(schema, /MMJ_RUNTIME_BINDING_05P_G_R2\.workbookId/)
assert.match(schema, /SpreadsheetApp\.openById\(workbookId\)/)
assert.match(schema, /manualFunctionBootstrap: false/)
assert.doesNotMatch(allGs, /SpreadsheetApp\.(getActiveSpreadsheet|getActive|getActiveSheet|getActiveRange)\s*\(/)
assert.doesNotMatch(allGs, /PropertiesService\.getDocumentProperties\s*\(/)
assert.doesNotMatch(allGs, /LockService\.getDocumentLock\s*\(/)
assert.doesNotMatch(allGs, /MMJ_CMS_WORKBOOK_ID|MMJ_MEDIA_CMS_SPREADSHEET_ID/)
assert.doesNotMatch(allGs, /cmsBindCurrentWorkbook|cmsSetupScriptProperties|cmsInitializeWorkbook/)
assert.doesNotMatch(read('ProductionAuthoringSidebar05JR1.html'), /bootstrap-workbook|refresh-mirrors/)
assert.doesNotMatch(browserBridge, /cmsRequestProductionBootstrap05JR1|cmsRequestProductionMirrorRefresh05JR1/)
assert.doesNotMatch(boundBridge, /cmsRequestProductionBootstrap05JR1|cmsRequestProductionMirrorRefresh05JR1/)

assert.match(menu, /function onOpen\(\)/)
assert.match(menu, /cmsOpenProductionAuthoring05JR1/)
assert.match(authoring, /cmsOpenProductionAuthoringPanel05PGR2_\(panel, null\)/)
assert.match(boundBridge, /ScriptApp\.getService\(\)\.getUrl\(\)/)
assert.match(boundBridge, /SpreadsheetApp\.getUi\(\)\.showSidebar/)
assert.match(boundBridge, /cmsCreateLaunchEnvelope05PGR2_/)
assert.match(boundBridge, /cmsVerifyLaunchEnvelope05PGR2_/)
assert.match(boundBridge, /cmsOwnerRpc05PGR2/)
assert.match(webapp, /function doGet\(event\)/)
assert.match(webapp, /XFrameOptionsMode\.ALLOWALL/)
assert.match(browserBridge, /\.cmsOwnerRpc05PGR2\(\{/)
assert.doesNotMatch(browserBridge, /\]\s*\.apply\(google\.script\.run/)
assert.match(read('BoundSidebarShell05PGR2.html'), /<iframe/)
assert.doesNotMatch(read('BoundSidebarShell05PGR2.html'), /google\.script\.run/)

assert.match(deploy, /node "scripts\/mmj-05p-g-r2-run-predeploy-gate\.mjs"/)
assert.doesNotMatch(deploy, /&\s*npm(?:\.cmd)?\s+run\s+gate:mmj-05p-g-r2/)
assert.equal(packageJson.scripts['gate:mmj-05p-g-r2'], 'node scripts/mmj-05p-g-r2-run-predeploy-gate.mjs')
assert.match(gateRunner, /spawnSync\(process\.execPath/)
assert.doesNotMatch(gateRunner, /npm(?:\.cmd)?['"\s]+run/)
assert.match(gateRunner, /PASS_MMJ_05P_G_R2_R2_DIRECT_NODE_GATE_RUNNER/)
assert.match(deploy, /mmj-05p-g-r2-resolve-bound-parent\.mjs/)
assert.match(deploy, /clasp @Arguments/)
assert.match(deploy, /@\('push', '--force'\)/)
assert.match(deploy, /@\('deploy'/)
assert.doesNotMatch(deploy, /clasp\s+create|clasp\s+run|run-function/)
assert.match(deploy, /SHA256\]::Create\(\)/)
assert.match(deploy, /ComputeHash\(\$bytes\)/)
assert.match(deploy, /RandomNumberGenerator\]::Create\(\)/)
assert.doesNotMatch(deploy, /::HashData|::ToHexString|RandomNumberGenerator\]::GetBytes\(/)
assert.match(deploy, /Read-ExistingLaunchKey/)
assert.match(deploy, /Test-DeploymentPresent/)
assert.match(resolver, /script\.googleapis\.com\/v1\/projects/)
assert.match(resolver, /parentId/)

const uiRpcNames = [...browserBridge.matchAll(/\bserver\(\s*['"]([^'"]+)['"]/g)].map(match => match[1])
const allowedRpcNames = [...boundBridge.matchAll(/^\s{4}'(cms[A-Za-z0-9_]+)':\s*(cms[A-Za-z0-9_]+__),?$/gm)].map(match => match[1])
assert.deepEqual([...new Set(uiRpcNames)].sort(), [...new Set(allowedRpcNames)].sort(), 'owner RPC whitelist drifted from the production UI call graph')
const publicServerFunctions = productionGs.flatMap(name => [...read(name).matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(match => match[1])).filter(name => !name.endsWith('_')).sort()
assert.equal(privateSurfaceMap.privatizedFunctions.length, 114)
assert.deepEqual(publicServerFunctions, [
  'cmsOpenProductionAuthoring05JR1',
  'cmsOpenProductionMediaLibrary05JR1',
  'cmsOpenProductionPublication05JR1',
  'cmsOpenProductionStatus05JR1',
  'cmsOpenProductionUpload05JR1',
  'cmsOwnerRpc05PGR2',
  'doGet',
  'onInstall',
  'onOpen',
], 'unexpected public Apps Script server function exposed to google.script.run')

if (sealed) {
  assert.doesNotMatch(binding, /__MMJ_05P_G_R2_WORKBOOK_ID_UNSEALED__/)
  assert.doesNotMatch(binding, /__MMJ_05P_G_R2_SCRIPT_ID_SHA256_UNSEALED__/)
  assert.match(binding, /workbookId: '[A-Za-z0-9_-]{20,}'/)
  assert.match(binding, /scriptIdSha256: '[a-f0-9]{64}'/)
  assert.doesNotMatch(launchSeal, /__MMJ_05P_G_R2_LAUNCH_KEY_UNSEALED__/)
  assert.match(launchSeal, /key: '[A-Za-z0-9_-]{32,}'/)
} else {
  const sourceSentinel = binding.includes('__MMJ_05P_G_R2_WORKBOOK_ID_UNSEALED__')
  const sealedBinding = /workbookId: '[A-Za-z0-9_-]{20,}'/.test(binding)
  assert(sourceSentinel || sealedBinding)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_05P_G_R2_EXISTING_BOUND_OWNER_WEBAPP_GATE',
  sealed,
  existingScriptIdPreserved: true,
  newAppsScriptProjects: 0,
  manualAppsScriptFunctionExecutions: 0,
  activeWorkbookCalls: 0,
  documentPropertyCalls: 0,
  ownerWebAppDataPlane: true,
  publicAppsScriptEntryPoints: publicServerFunctions.length,
  privatizedServerFunctions: privateSurfaceMap.privatizedFunctions.length,
}))
