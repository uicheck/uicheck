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
    mcp: string
    platforms: string
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
      eyebrow: 'UI Check for AI agents',
      title: 'AI 客户端接 MCP，应用接 WebSocket',
      lead: 'UI Check 把真实运行中的应用暴露给 AI。AI 只需要连接本机 @uicheck/mcp，应用侧以 @uicheck/web 为例连接同一个 WebSocket，就能返回截图、树状节点、布局盒、文本和坐标。',
      primary: '开始',
      mcp: '@uicheck/mcp',
      platforms: '多平台接入'
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
      title: '最小连接方式',
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
})`
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
      eyebrow: 'UI Check for AI agents',
      title: 'AI clients connect to MCP. Apps connect over WebSocket.',
      lead: 'UI Check exposes real running apps to AI agents. The AI client connects to local @uicheck/mcp, while the app runtime, using @uicheck/web as the example, connects to the same WebSocket endpoint and returns screenshots, tree-shaped nodes, layout boxes, text, and coordinates.',
      primary: 'Start',
      mcp: '@uicheck/mcp',
      platforms: 'Platform integrations'
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
      title: 'Minimal connection',
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
})`
    }
  }
} satisfies Record<Locale, HomeDictionary>

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN'
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (fromUrl === 'en' || fromUrl === 'zh-CN') return fromUrl
  const stored = window.localStorage.getItem('uicheck-locale')
  if (stored === 'en' || stored === 'zh-CN') return stored
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const t = dictionaries[locale]
  const docsBase = `/docs/${locale}/`

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

  return (
    <main className="home-entry">
      <nav className="nav home-entry-nav" aria-label="Primary">
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

      <section className="entry-hero" id="top">
        <div className="entry-copy">
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1>{t.hero.title}</h1>
          <p className="lead">{t.hero.lead}</p>
          <div className="hero-actions">
            <a className="button primary" href={docsBase}>
              {t.hero.primary}
            </a>
            <a className="button secondary" href={`${docsBase}mcp/`}>
              {t.hero.mcp}
            </a>
            <a className="button secondary" href="#platforms">
              {t.hero.platforms}
            </a>
          </div>
        </div>

        <div className="connection-panel" aria-label={t.hero.title}>
          {t.endpoints.map(([label, title, endpoint]) => (
            <article className="endpoint-card" key={endpoint}>
              <span>{label}</span>
              <h2>{title}</h2>
              <code>{endpoint}</code>
            </article>
          ))}
          <div className="connection-flow" aria-hidden="true">
            <span>AI</span>
            <i />
            <span>MCP</span>
            <i />
            <span>App</span>
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
        <div>
          <p className="eyebrow">Quick start</p>
          <h2>{t.example.title}</h2>
        </div>
        <pre>{t.example.body}</pre>
      </section>
    </main>
  )
}
