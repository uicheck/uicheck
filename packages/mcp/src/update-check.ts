export interface UpdateCheckResult {
  currentVersion: string
  latestVersion?: string
  updateAvailable: boolean
}

export interface CheckForMcpUpdateOptions {
  currentVersion: string
  packageName?: string
  fetchImpl?: typeof fetch
  log?: (message: string) => void
}

const DEFAULT_PACKAGE_NAME = '@uicheck/mcp'

export async function checkForMcpUpdate(options: CheckForMcpUpdateOptions): Promise<UpdateCheckResult | undefined> {
  const packageName = options.packageName ?? DEFAULT_PACKAGE_NAME
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (!fetchImpl) return undefined

  try {
    const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
      headers: {
        accept: 'application/json'
      }
    })
    if (!response.ok) return undefined

    const metadata = (await response.json()) as { version?: unknown }
    const latestVersion = typeof metadata.version === 'string' ? metadata.version : undefined
    if (!latestVersion) return undefined

    const updateAvailable = compareVersions(latestVersion, options.currentVersion) > 0
    if (updateAvailable) {
      options.log?.(`uicheck-mcp update available: ${options.currentVersion} -> ${latestVersion}. Run: npx ${packageName}@latest`)
    }

    return {
      currentVersion: options.currentVersion,
      latestVersion,
      updateAvailable
    }
  } catch {
    return undefined
  }
}

export function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left)
  const rightParts = normalizeVersion(right)
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index] ?? 0
    const rightPart = rightParts[index] ?? 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }
  return 0
}

function normalizeVersion(version: string): number[] {
  return version
    .replace(/^v/, '')
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part))
}
