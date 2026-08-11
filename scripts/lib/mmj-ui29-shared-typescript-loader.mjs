import {
  registerHooks,
  stripTypeScriptTypes,
} from 'node:module'
import {
  existsSync,
  readFileSync,
} from 'node:fs'
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path'
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url'

let registeredSharedRoot = null

function inside(root, candidate) {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

function requireSharedRoot(sourceRoot) {
  const root = resolve(sourceRoot)
  const sharedRoot = resolve(root, 'shared')
  if (!existsSync(sharedRoot)) {
    throw new Error(`MMJ shared TypeScript root is missing: ${sharedRoot}`)
  }
  return sharedRoot
}

export function registerMmjSharedTypeScriptLoader(sourceRoot) {
  const sharedRoot = requireSharedRoot(sourceRoot)
  if (registeredSharedRoot !== null) {
    if (registeredSharedRoot !== sharedRoot) {
      throw new Error(
        `MMJ shared TypeScript loader root conflict: ${registeredSharedRoot} != ${sharedRoot}`,
      )
    }
    return sharedRoot
  }

  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        (specifier.startsWith('./') || specifier.startsWith('../'))
        && typeof context.parentURL === 'string'
        && context.parentURL.startsWith('file:')
      ) {
        const parentPath = fileURLToPath(context.parentURL)
        if (inside(sharedRoot, parentPath)) {
          const base = resolve(dirname(parentPath), specifier)
          if (!inside(sharedRoot, base)) {
            throw new Error(
              `MMJ shared TypeScript import escaped repository shared root: ${specifier}`,
            )
          }
          const candidates = specifier.endsWith('.ts')
            ? [base]
            : [`${base}.ts`, resolve(base, 'index.ts')]
          for (const candidate of candidates) {
            if (inside(sharedRoot, candidate) && existsSync(candidate)) {
              return {
                url: pathToFileURL(candidate).href,
                shortCircuit: true,
              }
            }
          }
        }
      }
      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (url.startsWith('file:') && url.endsWith('.ts')) {
        const path = fileURLToPath(url)
        if (inside(sharedRoot, path)) {
          const source = readFileSync(path, 'utf8')
          return {
            format: 'module',
            source: stripTypeScriptTypes(source, { mode: 'transform' }),
            shortCircuit: true,
          }
        }
      }
      return nextLoad(url, context)
    },
  })

  registeredSharedRoot = sharedRoot
  return sharedRoot
}

export async function importMmjSharedTypeScriptModule(
  sourceRoot,
  relativePath,
) {
  if (
    typeof relativePath !== 'string'
    || !relativePath.startsWith('shared/')
    || !relativePath.endsWith('.ts')
    || relativePath.includes('..')
    || relativePath.includes('\\')
  ) {
    throw new Error(`Invalid MMJ shared TypeScript module path: ${relativePath}`)
  }
  const sharedRoot = registerMmjSharedTypeScriptLoader(sourceRoot)
  const absolute = resolve(sourceRoot, ...relativePath.split('/'))
  if (!inside(sharedRoot, absolute) || !existsSync(absolute)) {
    throw new Error(`MMJ shared TypeScript module is missing: ${relativePath}`)
  }
  return import(pathToFileURL(absolute).href)
}
