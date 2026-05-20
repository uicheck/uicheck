import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const siteRoot = new URL('..', import.meta.url)
const repoRoot = new URL('../../..', import.meta.url)
const outputUrl = new URL('app/generated-docs.ts', siteRoot)
const docsAppUrl = new URL('app/docs/', siteRoot)
const locales = ['zh-CN', 'en']
const githubBaseUrl = 'https://github.com/uicheck/uicheck/blob/main/'

const packages = [
  {
    id: 'web',
    path: 'packages/web',
    descriptions: {
      'zh-CN': '浏览器 DOM 页面客户端',
      en: 'Browser DOM client for uicheck'
    }
  },
  {
    id: 'taro',
    path: 'packages/taro',
    descriptions: {
      'zh-CN': 'Taro 小程序页面客户端',
      en: 'Taro Mini Program client for uicheck'
    }
  },
  {
    id: 'rn',
    path: 'packages/rn',
    descriptions: {
      'zh-CN': 'React Native 页面客户端',
      en: 'React Native client for uicheck'
    }
  },
  {
    id: 'flutter',
    path: 'packages/flutter',
    descriptions: {
      'zh-CN': 'Flutter 应用运行环境客户端',
      en: 'Flutter runtime client for uicheck'
    }
  },
  {
    id: 'android',
    path: 'packages/android',
    descriptions: {
      'zh-CN': 'Android 原生应用运行环境客户端',
      en: 'Android native runtime client for uicheck'
    }
  },
  {
    id: 'apple',
    path: 'packages/apple',
    descriptions: {
      'zh-CN': 'Apple 原生应用运行环境客户端',
      en: 'Apple native runtime client for uicheck'
    }
  },
  {
    id: 'mcp',
    path: 'packages/mcp',
    descriptions: {
      'zh-CN': '通过 WebSocket 连接 uicheck 客户端的 MCP 服务',
      en: 'MCP server that communicates with uicheck clients over WebSocket'
    }
  }
]

const mcpPackageId = 'mcp'

function getMcpDoc(docs) {
  return docs.find((doc) => doc.id === mcpPackageId)
}

function getPlatformDocs(docs) {
  return docs.filter((doc) => doc.id !== mcpPackageId)
}

function repoUrl(relativePath) {
  return new URL(relativePath, repoRoot)
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(repoUrl(relativePath), 'utf8'))
}

async function readTextIfExists(relativePath) {
  try {
    return await readFile(repoUrl(relativePath), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

function stripInlineCode(value) {
  return value.replace(/`([^`]+)`/g, '$1')
}

function parseTable(lines, startIndex) {
  const rows = []
  let index = startIndex
  while (index < lines.length && lines[index].trim().startsWith('|')) {
    const line = lines[index].trim()
    const cells = line
      .slice(1, line.endsWith('|') ? -1 : undefined)
      .split('|')
      .map((cell) => stripInlineCode(cell.trim()))
    rows.push(cells)
    index += 1
  }

  if (rows.length < 2) return null
  const separator = rows[1]
  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell))) return null

  return {
    block: {
      type: 'table',
      headers: rows[0],
      rows: rows.slice(2)
    },
    nextIndex: index
  }
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const codeStart = trimmed.match(/^```(\w+)?/)
    if (codeStart) {
      const lang = codeStart[1] ?? ''
      const content = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        content.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push({ type: 'code', lang, code: content.join('\n') })
      continue
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: stripInlineCode(heading[2]) })
      index += 1
      continue
    }

    if (trimmed.startsWith('|')) {
      const table = parseTable(lines, index)
      if (table) {
        blocks.push(table.block)
        index = table.nextIndex
        continue
      }
    }

    if (/^-\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(stripInlineCode(lines[index].trim().replace(/^-\s+/, '')))
        index += 1
      }
      blocks.push({ type: 'list', items })
      continue
    }

    const paragraph = [trimmed]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,6}\s+/.test(lines[index].trim()) &&
      !/^```/.test(lines[index].trim()) &&
      !/^- /.test(lines[index].trim()) &&
      !lines[index].trim().startsWith('|')
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: 'paragraph', text: stripInlineCode(paragraph.join(' ')) })
  }

  return blocks.filter((block) => block.type !== 'heading' || block.level !== 1)
}

function getInstallCommand(packageName) {
  if (packageName === '@uicheck/web') return 'npm install @uicheck/web'
  if (packageName === '@uicheck/mcp') return 'npm install -g @uicheck/mcp'
  if (packageName === 'uicheck_flutter') return 'flutter pub add uicheck_flutter'
  if (packageName === 'uicheck_android') return 'Android library: https://github.com/uicheck/uicheck, path packages/android'
  if (packageName === 'uicheck_apple') return 'Swift Package: https://github.com/uicheck/uicheck, product UICheckApple'
  return `npm install ${packageName}`
}

function frontmatter(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', ' ')
}

function stripFirstHeading(readme) {
  return readme.replace(/^# .*(?:\r?\n)+/, '').trim()
}

function mdxPage({ title, description, readme, sourceUrl, install }) {
  return `---
title: "${frontmatter(title)}"
description: "${frontmatter(description)}"
---

# ${title}

> Source: [README](${sourceUrl})

## Install

\`\`\`bash
${install}
\`\`\`

${stripFirstHeading(readme)}
`
}

async function writeDocsPages(generated, readmesByLocale) {
  await mkdir(docsAppUrl, { recursive: true })
  await Promise.all(locales.map((locale) => rm(new URL(`${locale}/`, docsAppUrl), { recursive: true, force: true })))

  await writeFile(
    new URL('_meta.js', docsAppUrl),
    `const meta = {
  'zh-CN': '中文',
  en: 'English'
}

export default meta
`
  )

  for (const locale of locales) {
    const localeRoot = new URL(`${locale}/`, docsAppUrl)
    await mkdir(localeRoot, { recursive: true })

    await writeFile(
      new URL('_meta.js', localeRoot),
      `const meta = {
  index: '${locale === 'zh-CN' ? '开始' : 'Start'}',
  mcp: ${JSON.stringify(readmesByLocale[locale].mcp.name)},
${packages
  .filter((item) => item.id !== 'mcp')
  .map((item) => `  ${JSON.stringify(item.id)}: ${JSON.stringify(readmesByLocale[locale][item.id].name)},`)
  .join('\n')}
}

export default meta
`
    )

    const mcpDoc = getMcpDoc(generated[locale])
    const platformDocs = getPlatformDocs(generated[locale])
    const startCopy =
      locale === 'zh-CN'
        ? {
            title: 'UI Check 文档',
            description: 'AI 可读的 UI 检查工具文档',
            lead: 'UI Check 的连接模型很简单：AI 客户端接 MCP，应用运行环境接 WebSocket。快速开始以 @uicheck/web 为例；其他应用平台可以在多平台接入里选择对应包。',
            mcpHeading: 'AI 客户端',
            mcpText: '配置 @uicheck/mcp，让 AI 可以调用 list_clients、capture_page 和 inspect_elements。',
            platformHeading: '多平台接入'
          }
        : {
            title: 'UI Check Docs',
            description: 'Documentation for AI-readable UI inspection',
            lead: 'UI Check has one connection model: AI clients connect to MCP, and app runtimes connect over WebSocket. The quick start uses @uicheck/web as the app example; choose another platform package under Platform integrations when needed.',
            mcpHeading: 'AI client',
            mcpText: 'Configure @uicheck/mcp so AI can call list_clients, capture_page, and inspect_elements.',
            platformHeading: 'Platform integrations'
          }

    await writeFile(
      new URL('page.mdx', localeRoot),
      `---
title: "${startCopy.title}"
description: "${startCopy.description}"
---

# ${startCopy.title}

${startCopy.lead}

## ${startCopy.mcpHeading}

- [${mcpDoc.name}](./${mcpDoc.id}/) - ${startCopy.mcpText}

## ${startCopy.platformHeading}

${platformDocs.map((doc) => `- [${doc.name}](./${doc.id}/) - ${doc.description}`).join('\n')}
`
    )

    for (const doc of generated[locale]) {
      const docRoot = new URL(`${doc.id}/`, localeRoot)
      await mkdir(docRoot, { recursive: true })
      await writeFile(
        new URL('page.mdx', docRoot),
        mdxPage({
          title: doc.name,
          description: doc.description,
          readme: readmesByLocale[locale][doc.id].readme,
          sourceUrl: doc.readmeUrl,
          install: doc.install
        })
      )
    }
  }
}

async function buildDocs() {
  const generated = Object.fromEntries(locales.map((locale) => [locale, []]))
  const readmesByLocale = Object.fromEntries(locales.map((locale) => [locale, {}]))

  for (const locale of locales) {
    for (const item of packages) {
      const packageJson = await readJson(`${item.path}/package.json`)
      const readmePath = locale === 'en' ? `${item.path}/README.md` : `${item.path}/README.${locale}.md`
      const fallbackReadmePath = `${item.path}/README.md`
      const localizedReadme = await readTextIfExists(readmePath)
      const actualReadmePath = localizedReadme ? readmePath : fallbackReadmePath
      const readme = localizedReadme ?? (await readFile(repoUrl(fallbackReadmePath), 'utf8'))
      const doc = {
        id: item.id,
        name: packageJson.name,
        version: packageJson.version,
        description: item.descriptions[locale] ?? packageJson.description,
        install: getInstallCommand(packageJson.name),
        source: item.path,
        readmeUrl: `${githubBaseUrl}${actualReadmePath}`,
        blocks: parseMarkdown(readme)
      }
      readmesByLocale[locale][item.id] = { name: packageJson.name, readme }
      generated[locale].push({
        ...doc
      })
    }
  }

  await writeDocsPages(generated, readmesByLocale)
  return generated
}

const docs = await buildDocs()
const output = `// This file is generated by packages/site/scripts/generate-docs.mjs.
// Do not edit by hand.

export type GeneratedDocBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }

export interface GeneratedPackageDoc {
  id: string
  name: string
  version: string
  description: string
  install: string
  source: string
  readmeUrl: string
  blocks: GeneratedDocBlock[]
}

export type GeneratedLocale = ${JSON.stringify(locales)}[number]

export const generatedDocsByLocale = ${JSON.stringify(docs, null, 2)} satisfies Record<GeneratedLocale, GeneratedPackageDoc[]>
`

await mkdir(dirname(fileURLToPath(outputUrl)), { recursive: true })
await writeFile(outputUrl, output)
