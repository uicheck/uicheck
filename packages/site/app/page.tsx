'use client'

import { useEffect, useMemo, useState } from 'react'
import { generatedDocsByLocale, type GeneratedLocale } from './generated-docs'

const locales = ['zh-CN', 'en'] as const satisfies GeneratedLocale[]
type Locale = (typeof locales)[number]
const githubUrl = 'https://github.com/uicheck/uicheck'

const dictionaries = {
  'zh-CN': {
    htmlLang: 'zh-CN',
    nav: {
      workflow: '工作流',
      tools: 'MCP Tools',
      docs: '文档',
      install: '接入',
      github: 'GitHub'
    },
    languageLabel: '语言',
    hero: {
      eyebrow: '@uicheck/mcp for AI agents',
      title: '给 AI 用的真实 UI 检查工具',
      lead: 'UI Check 让 AI 通过 MCP 连接正在运行的应用，直接读取截图、元素树、布局盒、坐标和页面状态。浏览器、Taro 小程序、React Native 都可以接入同一个本地 MCP 服务。',
      primary: '开始接入',
      secondary: 'AI 如何调用',
      previewLabel: 'AI 通过 MCP 检查 UI 的流程预览'
    },
    workflow: {
      eyebrow: 'AI Workflow',
      title: 'AI 先接 MCP，再观察真实运行环境',
      text: 'uicheck 的重点不是给用户一个页面插件，而是给 AI 一个稳定的观察通道。应用侧客户端负责把真实 UI 暴露给本机 MCP，AI 客户端只需要接入 MCP endpoint。',
      steps: [
        ['1', '启动 @uicheck/mcp', '在本地启动 MCP 服务，向 AI 客户端暴露 http://127.0.0.1:17322/mcp。'],
        ['2', '应用接入运行环境客户端', 'Web、Taro、React Native 通过 WebSocket 连接同一个 MCP 服务。'],
        ['3', 'AI 调用 MCP 工具', 'AI 读取已连接客户端列表、页面截图、元素布局、文本和坐标。'],
        ['4', '基于真实证据修复 UI', 'AI 拿到运行时观察结果后，再回到代码里定位和修改问题。']
      ]
    },
    tools: {
      eyebrow: 'MCP Tools',
      title: 'AI 可以直接调用的 UI 观察能力',
      text: '@uicheck/mcp 是本地 MCP 服务。把它配置到 Cursor、Claude Desktop、Codex 等支持 MCP 的 AI 工具后，AI 就能向已连接的应用请求 UI 证据。',
      items: [
        ['list_clients', '查看已连接的运行环境、标题、URL/路由、视口和在线状态。'],
        ['capture_page', '请求当前应用返回 PNG 截图，让 AI 看到真实 UI。'],
        ['inspect_elements', '读取选择器或已注册组件的文本、布局盒、可见状态和元数据。'],
        ['get_element_at_point', '按坐标定位元素，适合排查错位、遮挡和触控区域问题。']
      ]
    },
    runtimes: {
      eyebrow: 'Runtimes',
      title: '同一个 MCP 服务，连接不同运行环境',
      text: '不同平台只负责把自己的 UI 能力转成 uicheck 协议。AI 不需要知道页面来自浏览器、Taro 小程序还是 React Native，它只调用同一组 MCP tools。',
      useCases: [
        '@uicheck/web 读取浏览器 DOM、截图和坐标',
        '@uicheck/taro 通过 selector query 读取小程序节点',
        '@uicheck/rn 通过注册 ref 暴露组件位置、testID 和 accessibilityLabel',
        'uicheck_flutter 通过 GlobalKey 暴露组件位置和截图',
        'UICheckAndroid 通过原生 View 或 frame provider 暴露视图',
        'UICheckApple 通过原生 UIView/NSView 或 frame provider 暴露视图',
        '@uicheck/core 复用 WebSocket 协议和客户端 runtime'
      ]
    },
    docs: {
      eyebrow: 'Docs',
      title: '文档独立维护，首页只保留入口',
      text: '完整包文档、安装方式和 API 说明已经移动到独立文档页。官网构建时仍会从 workspace README 自动生成内容。',
      action: '打开文档'
    },
    install: {
      eyebrow: 'Install',
      title: 'AI 客户端接 MCP，应用接 WebSocket',
      text: '先启动本地 MCP 服务，把 MCP endpoint 配给 AI；再在对应运行环境安装客户端，让应用连接 socket endpoint。',
      mcpTitle: '启动 @uicheck/mcp',
      webTitle: 'Web 运行环境接入'
    }
  },
  en: {
    htmlLang: 'en',
    nav: {
      workflow: 'Workflow',
      tools: 'MCP Tools',
      docs: 'Docs',
      install: 'Install',
      github: 'GitHub'
    },
    languageLabel: 'Language',
    hero: {
      eyebrow: '@uicheck/mcp for AI agents',
      title: 'Runtime UI inspection built for AI',
      lead: 'UI Check lets AI agents connect to running apps through MCP and read screenshots, element trees, layout boxes, coordinates, and page state. Browser, Taro Mini Program, and React Native clients all connect to the same local MCP server.',
      primary: 'Get started',
      secondary: 'How AI calls it',
      previewLabel: 'AI inspecting UI through MCP preview'
    },
    workflow: {
      eyebrow: 'AI Workflow',
      title: 'Connect AI to MCP, then inspect the real runtime',
      text: 'uicheck is not centered on an end-user page widget. It gives AI a stable observation channel. Runtime clients expose the real UI to local MCP, and AI clients connect to the MCP endpoint.',
      steps: [
        ['1', 'Start @uicheck/mcp', 'Run the local MCP server and expose http://127.0.0.1:17322/mcp to your AI client.'],
        ['2', 'Install a runtime client', 'Web, Taro, and React Native clients connect to the same MCP server over WebSocket.'],
        ['3', 'Let AI call MCP tools', 'AI reads connected clients, screenshots, element layout, text, and coordinates.'],
        ['4', 'Fix UI from real evidence', 'The agent uses runtime observations before changing source code.']
      ]
    },
    tools: {
      eyebrow: 'MCP Tools',
      title: 'UI inspection tools AI can call directly',
      text: '@uicheck/mcp runs locally. Configure it in Cursor, Claude Desktop, Codex, or any MCP-capable AI tool so the agent can request observations from connected apps.',
      items: [
        ['list_clients', 'List connected runtimes with title, URL or route, viewport, and online status.'],
        ['capture_page', 'Ask the app for a PNG screenshot so AI can inspect the current UI.'],
        ['inspect_elements', 'Read selectors or registered components with text, layout boxes, visibility, and metadata.'],
        ['get_element_at_point', 'Locate the element at viewport coordinates for overlap, offset, and touch-target issues.']
      ]
    },
    runtimes: {
      eyebrow: 'Runtimes',
      title: 'One MCP server for multiple runtimes',
      text: 'Each platform adapts its own UI model into the uicheck protocol. AI does not need to know whether the screen comes from a browser, a Taro Mini Program, or React Native; it calls the same MCP tools.',
      useCases: [
        '@uicheck/web reads browser DOM, screenshots, and coordinates',
        '@uicheck/taro reads Mini Program nodes through selector query',
        '@uicheck/rn exposes component boxes, testID, and accessibilityLabel through registered refs',
        'uicheck_flutter exposes widget boxes and screenshots through GlobalKey',
        'UICheckAndroid exposes native View metadata through registered views or frame providers',
        'UICheckApple exposes native UIView/NSView metadata through registered views or frame providers',
        '@uicheck/core shares the WebSocket protocol runtime and types'
      ]
    },
    docs: {
      eyebrow: 'Docs',
      title: 'Docs live in their own workspace',
      text: 'Package docs, install notes, and API details now live on a dedicated docs page. The website still generates them from workspace READMEs before build.',
      action: 'Open docs'
    },
    install: {
      eyebrow: 'Install',
      title: 'AI connects to MCP, apps connect over WebSocket',
      text: 'Start the local MCP server, configure the MCP endpoint in your AI client, then install the runtime client that matches your app.',
      mcpTitle: 'Start @uicheck/mcp',
      webTitle: 'Connect a Web runtime'
    }
  }
} satisfies Record<Locale, Record<string, unknown>>

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
  const docs = generatedDocsByLocale[locale]
  const docsBase = `/docs/${locale}/`

  useEffect(() => {
    document.documentElement.lang = dictionaries[locale].htmlLang
  }, [locale])

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale)
    window.localStorage.setItem('uicheck-locale', nextLocale)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', nextLocale)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const mcpCode = useMemo(
    () => `npm install -g @uicheck/mcp
uicheck-mcp

# MCP    http://127.0.0.1:17322/mcp
# Socket ws://127.0.0.1:17322/socket`,
    []
  )
  const webCode = useMemo(
    () => `npm install @uicheck/web html2canvas

import html2canvas from 'html2canvas'
import { installUiCheck } from '@uicheck/web'

installUiCheck(html2canvas, {
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})`,
    []
  )

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
              <a href="#workflow">{t.nav.workflow}</a>
              <a href="#tools">{t.nav.tools}</a>
              <a href={docsBase}>{t.nav.docs}</a>
              <a href="#install">{t.nav.install}</a>
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
              <a className="button primary" href="#install">
                {t.hero.primary}
              </a>
              <a className="button secondary" href="#tools">
                {t.hero.secondary}
              </a>
              <a className="button secondary" href={githubUrl} rel="noreferrer" target="_blank">
                GitHub
              </a>
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
              <div className="runtime-pill browser-pill">@uicheck/web</div>
              <div className="runtime-pill socket-pill">WebSocket client</div>
            </div>

            <div className="agent-panel">
              <div>
                <span className="status-dot" />
                <span>AI Agent via MCP</span>
              </div>
              <pre>{`{
  "mcpServers": {
    "uicheck": {
      "url": "http://127.0.0.1:17322/mcp"
    }
  }
}

inspect_elements({
  selector: ".mock-grid",
  limit: 20
})

capture_page({ waitMs: 300 })`}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="section strip" id="workflow">
        <div className="section-head">
          <p className="eyebrow">{t.workflow.eyebrow}</p>
          <h2>{t.workflow.title}</h2>
          <p>{t.workflow.text}</p>
        </div>
        <div className="timeline">
          {t.workflow.steps.map(([number, title, text]) => (
            <div className="step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section split" id="tools">
        <div className="section-head align-left">
          <p className="eyebrow">{t.tools.eyebrow}</p>
          <h2>{t.tools.title}</h2>
          <p>{t.tools.text}</p>
        </div>
        <div className="tool-list">
          {t.tools.items.map(([name, description]) => (
            <article className="tool-card" key={name}>
              <code>{name}</code>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section visual-band">
        <div className="clipboard-preview">
          <div className="runtime-diagram" aria-hidden="true">
            <div className="runtime-hub">
              <span>@uicheck/mcp</span>
              <strong>MCP endpoint</strong>
              <code>127.0.0.1:17322/mcp</code>
            </div>
            <div className="runtime-nodes">
              <span>@uicheck/web</span>
              <span>@uicheck/taro</span>
              <span>@uicheck/rn</span>
              <span>uicheck_flutter</span>
              <span>UICheckAndroid</span>
              <span>UICheckApple</span>
            </div>
          </div>
          <div className="clipboard-copy">
            <p className="eyebrow">{t.runtimes.eyebrow}</p>
            <h2>{t.runtimes.title}</h2>
            <p>{t.runtimes.text}</p>
            <ul>
              {t.runtimes.useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section docs" id="docs">
        <div className="docs-callout">
          <div>
            <p className="eyebrow">{t.docs.eyebrow}</p>
            <h2>{t.docs.title}</h2>
            <p>{t.docs.text}</p>
          </div>
          <a className="button primary" href={docsBase}>
            {t.docs.action}
          </a>
        </div>
        <div className="docs-preview-grid">
          {docs.map((doc) => (
            <a className="doc-preview-card" href={`${docsBase}${doc.id}/`} key={doc.id}>
              <div>
                <span>{doc.version}</span>
                <h3>{doc.name}</h3>
                <p>{doc.description}</p>
              </div>
              <code>{doc.install}</code>
            </a>
          ))}
        </div>
      </section>

      <section className="section install" id="install">
        <div className="section-head">
          <p className="eyebrow">{t.install.eyebrow}</p>
          <h2>{t.install.title}</h2>
          <p>{t.install.text}</p>
        </div>
        <div className="code-grid">
          <div className="code-block">
            <div className="code-title">{t.install.mcpTitle}</div>
            <pre>{mcpCode}</pre>
          </div>
          <div className="code-block">
            <div className="code-title">{t.install.webTitle}</div>
            <pre>{webCode}</pre>
          </div>
        </div>
      </section>
    </main>
  )
}
