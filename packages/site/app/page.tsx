'use client'

import { useEffect, useState } from 'react'
import type { GeneratedLocale } from './generated-docs'

const locales = ['zh-CN', 'en'] as const satisfies GeneratedLocale[]
type Locale = (typeof locales)[number]
const githubUrl = 'https://github.com/uicheck/uicheck'

const platformEntries = [
  ['web', '@uicheck/web'],
  ['taro', '@uicheck/taro'],
  ['rn', '@uicheck/rn'],
  ['flutter', 'uicheck_flutter'],
  ['apple', 'uicheck_apple'],
  ['android', 'uicheck_android']
] as const

type PlatformId = (typeof platformEntries)[number][0]

interface HomeDictionary {
  htmlLang: string
  nav: {
    docs: string
    github: string
  }
  languageLabel: string
  hero: {
    eyebrow: string
    title: string
    lead: string
    primary: string
    secondary: string
    previewLabel: string
    agentPromptLabel: string
    agentPrompt: string
    copyPrompt: string
    copiedPrompt: string
    copyFailedPrompt: string
  }
  endpoints: [string, string, string][]
  platform: {
    eyebrow: string
    title: string
    text: string
    descriptions: Record<PlatformId, string>
  }
  example: {
    title: string
    body: string
    docsButton: string
  }
}

const dictionaries = {
  'zh-CN': {
    htmlLang: 'zh-CN',
    nav: {
      docs: '文档',
      github: 'GitHub'
    },
    languageLabel: '语言',
    hero: {
      eyebrow: '@uicheck/mcp + @uicheck/web',
      title: '让 AI 看懂真实浏览器页面',
      lead: 'UI Check 把页面截图、DOM 元素、布局盒、间距和坐标暴露给 AI。AI 可以通过 MCP 查询页面，也可以接收人工标注后的图片证据，再回到代码里修复 UI。',
      primary: '开始接入',
      secondary: '查看工具',
      previewLabel: 'UI Check 产品预览',
      agentPromptLabel: '给 Agent',
      agentPrompt: '安装 uicheck.ai，并使用 uicheck 检查元素',
      copyPrompt: '复制',
      copiedPrompt: '已复制',
      copyFailedPrompt: '复制失败'
    },
    endpoints: [
      ['AI 客户端', '连接 MCP endpoint', 'http://127.0.0.1:17322/mcp'],
      ['应用运行环境', 'Web 接入 WebSocket endpoint', 'ws://127.0.0.1:17322/socket']
    ],
    platform: {
      eyebrow: 'Multi-runtime entrypoints',
      title: '选择应用运行环境',
      text: '不同平台只负责把自己的 UI 能力转成 uicheck 协议。AI 客户端不需要区分 Web、Taro、小程序、RN、Flutter 或原生应用。',
      descriptions: {
        web: '浏览器 DOM 页面，读取真实 DOM、截图、视口和元素布局。',
        taro: 'Taro 小程序页面，通过 selector query 返回小程序节点树。',
        rn: 'React Native 应用，读取 testID、accessibilityLabel 和运行时布局。',
        flutter: 'Flutter 应用，通过运行时客户端暴露组件树、截图和布局。',
        apple: 'iOS/macOS 原生应用，通过 Swift 客户端接入 UIView/NSView。',
        android: 'Android 原生应用，通过 Kotlin 客户端接入 View 层级。'
      }
    },
    example: {
      title: '在 Web 端接入',
      body: `# 1. 启动 MCP 服务
npm install -g @uicheck/mcp
uicheck-mcp

# 2. AI 客户端配置 MCP
http://127.0.0.1:17322/mcp

# 3. Web 应用侧连接 WebSocket
npm install @uicheck/web

import { initUiCheck } from '@uicheck/web'

initUiCheck({
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})`,
      docsButton: '查看多平台文档'
    }
  },
  en: {
    htmlLang: 'en',
    nav: {
      docs: 'Docs',
      github: 'GitHub'
    },
    languageLabel: 'Language',
    hero: {
      eyebrow: '@uicheck/mcp + @uicheck/web',
      title: 'Help AI understand real browser pages',
      lead: 'UI Check exposes screenshots, DOM elements, layout boxes, spacing, and coordinates to AI. Agents can query the live page through MCP or use manually annotated visual evidence before fixing UI code.',
      primary: 'Get started',
      secondary: 'View tools',
      previewLabel: 'UI Check product preview',
      agentPromptLabel: 'For agents',
      agentPrompt: 'Install uicheck.ai and use uicheck to inspect elements',
      copyPrompt: 'Copy',
      copiedPrompt: 'Copied',
      copyFailedPrompt: 'Failed'
    },
    endpoints: [
      ['AI client', 'Connects to the MCP endpoint', 'http://127.0.0.1:17322/mcp'],
      ['App runtime', 'Web connects to the WebSocket endpoint', 'ws://127.0.0.1:17322/socket']
    ],
    platform: {
      eyebrow: 'Multi-runtime entrypoints',
      title: 'Choose your app runtime',
      text: 'Each platform adapts its own UI model into the uicheck protocol. The AI client does not need to know whether the screen comes from Web, Taro, React Native, Flutter, or native apps.',
      descriptions: {
        web: 'Browser DOM pages with real DOM, screenshots, viewport, and element layout.',
        taro: 'Taro Mini Program pages with selector-query backed node trees.',
        rn: 'React Native apps with testID, accessibilityLabel, and runtime layout.',
        flutter: 'Flutter apps with runtime widget trees, screenshots, and layout boxes.',
        apple: 'Native iOS/macOS apps through the Swift UIView/NSView client.',
        android: 'Native Android apps through the Kotlin View hierarchy client.'
      }
    },
    example: {
      title: 'Connect on Web',
      body: `# 1. Start the MCP server
npm install -g @uicheck/mcp
uicheck-mcp

# 2. Configure MCP in the AI client
http://127.0.0.1:17322/mcp

# 3. Connect a Web app over WebSocket
npm install @uicheck/web

import { initUiCheck } from '@uicheck/web'

initUiCheck({
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})`,
      docsButton: 'View platform docs'
    }
  }
} satisfies Record<Locale, HomeDictionary>

function getPreferredLocale(): Locale {
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (fromUrl === 'en' || fromUrl === 'zh-CN') return fromUrl
  const stored = window.localStorage.getItem('uicheck-locale')
  if (stored === 'en' || stored === 'zh-CN') return stored
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

function highlightExampleLine(line: string) {
  if (!line) return '\u00a0'
  if (line.startsWith('#')) return <span className="home-code-comment">{line}</span>
  if (line.startsWith('npm ') || line === 'uicheck-mcp' || line.startsWith('http')) return <span className="home-code-command">{line}</span>
  if (line.startsWith('import')) return <span className="home-code-keyword">{line}</span>
  if (line.includes("'ws://")) return <span className="home-code-string">{line}</span>
  if (/^\s*[{}),]+$/.test(line)) return <span className="home-code-punctuation">{line}</span>
  return <span className="home-code-property">{line}</span>
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('zh-CN')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const t = dictionaries[locale]
  const docsBase = `/docs/${locale}/`

  useEffect(() => {
    const timer = window.setTimeout(() => setLocale(getPreferredLocale()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.lang = t.htmlLang
  }, [t.htmlLang])

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale)
    window.localStorage.setItem('uicheck-locale', nextLocale)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', nextLocale)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  async function copyAgentPrompt() {
    let copied = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(t.hero.agentPrompt)
        copied = true
      }
    } catch {
      copied = false
    }

    if (!copied) {
      const textarea = document.createElement('textarea')
      textarea.value = t.hero.agentPrompt
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.select()
      copied = document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    setCopyState(copied ? 'copied' : 'failed')
    window.setTimeout(() => setCopyState('idle'), 1600)
  }

  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Primary">
          <a className="brand" href="#top" aria-label="UI Check home">
            <span className="brand-mark">UI</span>
            <span>UI Check</span>
          </a>
          <div className="nav-actions">
            <div className="nav-links">
              <a href={docsBase}>{t.nav.docs}</a>
              <a href={githubUrl} rel="noreferrer" target="_blank">
                {t.nav.github}
              </a>
            </div>
            <div className="locale-switcher" aria-label={t.languageLabel}>
              {locales.map((item) => (
                <button className={item === locale ? 'active' : ''} key={item} type="button" onClick={() => changeLocale(item)}>
                  {item === 'zh-CN' ? '中' : 'EN'}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="hero-inner" id="top">
          <div className="hero-copy">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h1>{t.hero.title}</h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="hero-actions">
              <a className="button primary" href={docsBase}>
                {t.hero.primary}
              </a>
              <a className="button secondary" href={`${docsBase}mcp/`}>
                {t.hero.secondary}
              </a>
            </div>
            <div className="agent-copy-row">
              <span>{t.hero.agentPromptLabel}</span>
              <code>{t.hero.agentPrompt}</code>
              <button type="button" onClick={copyAgentPrompt}>
                {copyState === 'copied' ? t.hero.copiedPrompt : copyState === 'failed' ? t.hero.copyFailedPrompt : t.hero.copyPrompt}
              </button>
            </div>
          </div>

          <div className="inspector" aria-label={t.hero.previewLabel}>
            <div className="browser">
              <div className="browser-bar">
                <span />
                <span />
                <span />
                <code>localhost:3000/dashboard</code>
              </div>
              <div className="mock-page">
                <div className="mock-sidebar">
                  <b>Studio</b>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="mock-content">
                  <div className="mock-header">
                    <span />
                    <button>Publish</button>
                  </div>
                  <div className="mock-grid">
                    <article className="target target-one">
                      <span className="pin">1</span>
                      <strong>Revenue</strong>
                      <em>+18.2%</em>
                    </article>
                    <article className="target target-two">
                      <span className="pin">2</span>
                      <strong>Conversion</strong>
                      <em>3.74%</em>
                    </article>
                    <article>
                      <strong>Latency</strong>
                      <em>126ms</em>
                    </article>
                  </div>
                  <div className="mock-table">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>

            <div className="agent-panel">
              <div>
                <span className="status-dot" />
                <span>AI Agent</span>
              </div>
              <pre>{`inspect_elements({
  selector: ".mock-grid",
  limit: 20
})

capture_page({ waitMs: 300 })`}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-entry" id="platforms">
        <div className="section-head">
          <p className="eyebrow">{t.platform.eyebrow}</p>
          <h2>{t.platform.title}</h2>
          <p>{t.platform.text}</p>
        </div>
        <div className="platform-entry-grid">
          {platformEntries.map(([id, name]) => (
            <a className="platform-entry-card" href={`${docsBase}${id}/`} key={id}>
              <span>{name}</span>
              <p>{t.platform.descriptions[id]}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="quick-start">
        <div className="quick-start-copy">
          <p className="eyebrow">Quick start</p>
          <h2>{t.example.title}</h2>
          <a className="button secondary quick-start-doc-button" href={docsBase}>
            <span>{t.example.docsButton}</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="quick-start-content">
          <pre className="home-code-block">
            <code>
              {t.example.body.split('\n').map((line, index) => (
                <span className="home-code-line" key={`${index}-${line}`}>
                  {highlightExampleLine(line)}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </section>
    </main>
  )
}
